import mysql from 'mysql2/promise';
import type { Pool, PoolConnection, Connection, FieldPacket, QueryResult, QueryOptions } from 'mysql2/promise';

/**
 * transaction 콜백에서 사용하는 커넥션 인터페이스.
 * mysql2의 믹스인 타입 체인이 TypeScript 6에서 올바르게 해석되지 않아
 * query 메서드를 명시적으로 선언합니다.
 */
export interface TransactionConnection {
    query<T extends QueryResult>(sql: string, values?: unknown): Promise<[T, FieldPacket[]]>;
    query<T extends QueryResult>(options: QueryOptions, values?: unknown): Promise<[T, FieldPacket[]]>;
}

export type { Pool, PoolConnection, Connection };

/**
 * MySQL 커넥션 풀
 *
 * 모듈 레벨에서 초기화해 Cold Start 이후 동일 인스턴스를 재사용합니다.
 * 환경변수는 TCB 콘솔 → Cloud Functions → Environment Variables 에서 설정하세요.
 *
 * 필수 환경변수 (cloudbaserc.json → envVariables 에서 설정):
 *   DB_HOST      — MySQL 호스트
 *   DB_PORT      — MySQL 포트
 *   DB_USER      — 사용자명
 *   DB_PASSWORD  — 비밀번호
 *   DB_NAME      — 데이터베이스명
 *
 * keepAlive/idleTimeout/maxIdle 은 TCB 런타임의 컨테이너 freeze 이후
 * 죽은 커넥션이 풀에서 재배포되며 나는 첫 접근 오류(read ECONNRESET /
 * Malformed communication packet)를 예방하기 위한 설정입니다.
 */
export const pool: Pool = mysql.createPool({
    host:               process.env.DB_HOST!,
    port:               Number(process.env.DB_PORT),
    user:               process.env.DB_USER!,
    password:           process.env.DB_PASSWORD!,
    database:           process.env.DB_NAME!,
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,
    enableKeepAlive:    true,
    keepAliveInitialDelay: 10_000,
    idleTimeout:        60_000, // 오래 논 커넥션은 stale 이 되기 전에 풀에서 정리
    maxIdle:            2,      // freeze 중 죽을 수 있는 유휴 커넥션 수를 최소화
});

/**
 * 콜드 커넥션의 첫 접근에서 관측되는 일시 오류 (실측: TCB + CynosDB 게이트웨이).
 * 이 오류들은 "요청이 서버에서 실행됐는지" 불확실하므로,
 * 재시도는 멱등이 보장된 경로(queryIdempotent, transaction 시작 단계)에서만 합니다.
 */
const TRANSIENT_CONN_ERROR = /ECONNRESET|Malformed communication packet/i;

function isTransientConnError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    return TRANSIENT_CONN_ERROR.test(msg);
}

/**
 * 멱등 쿼리 전용 실행 헬퍼 — 일시 커넥션 오류에 한해 1회 재시도합니다.
 *
 * ⚠️ 반드시 **멱등한 쿼리에만** 사용하세요:
 *   - DDL: CREATE TABLE IF NOT EXISTS ...
 *   - 시드/업서트: INSERT ... ON DUPLICATE KEY UPDATE ...
 *   - 조회: SELECT ...
 * 일반 INSERT/차감 UPDATE 처럼 재실행 시 결과가 달라지는 쿼리에 쓰면
 * 첫 시도가 서버에서 이미 실행된 경우 **중복 반영**될 수 있습니다.
 * 그런 작업은 (playerId, idempotencyKey) 멱등성 패턴으로 보호하세요.
 *
 * @example
 * await queryIdempotent(ddl.replace(/\s+/g, ' ').trim());
 * await queryIdempotent('INSERT INTO items ... ON DUPLICATE KEY UPDATE ...', [id, name]);
 */
export async function queryIdempotent<T extends QueryResult = QueryResult>(
    sql: string,
    values?: unknown
): Promise<[T, FieldPacket[]]> {
    // 커넥션을 명시적으로 잡고, 오류 시 파기(destroy)한 뒤 새 커넥션으로 재시도한다.
    // pool.query 재시도는 mysql2 가 이 오류를 fatal 로 보지 않으면 오염된 같은
    // 커넥션을 다시 잡아 재시도가 무의미해진다(실측: 콜드스타트 직후 2회 연속 실패).
    // (values 는 TransactionConnection 과 동일하게 unknown 으로 받고 호출 시점에만 좁힌다 —
    //  mysql2 의 QueryValues 타입이 export 되지 않음)
    const attempt = async (): Promise<[T, FieldPacket[]]> => {
        const conn = await pool.getConnection();
        try {
            const result = await conn.query<T>(sql, values as never);
            conn.release();
            return result;
        } catch (err) {
            conn.destroy();
            throw err;
        }
    };

    try {
        return await attempt();
    } catch (err) {
        if (!isTransientConnError(err)) throw err;
        return await attempt();
    }
}

/**
 * 트랜잭션 시작(커넥션 확보 + BEGIN)을 수행하고, 일시 커넥션 오류면 1회 재시도합니다.
 * 이 단계는 아직 아무 SQL 도 실행되기 전이므로 재시도해도 부작용이 없습니다.
 * 오류가 난 커넥션은 풀에 반환하지 않고 파기(destroy)해 오염 전파를 막습니다.
 */
async function beginTransaction(): Promise<PoolConnection> {
    const attempt = async (): Promise<PoolConnection> => {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            return conn;
        } catch (err) {
            conn.destroy();
            throw err;
        }
    };

    try {
        return await attempt();
    } catch (err) {
        if (!isTransientConnError(err)) throw err;
        return await attempt();
    }
}

/**
 * 트랜잭션 헬퍼
 *
 * fn 내부에서 예외가 발생하면 자동으로 ROLLBACK 후 예외를 다시 던집니다.
 * fn 이 정상 종료되면 COMMIT 합니다.
 *
 * 시작 단계(커넥션 확보 + BEGIN)의 일시 커넥션 오류는 1회 자동 재시도합니다 —
 * 아직 SQL 실행 전이라 안전합니다. fn 실행 이후의 오류는 비멱등할 수 있으므로
 * 재시도하지 않습니다.
 *
 * @example
 * const rewardId = await transaction(async (conn) => {
 *     const [r] = await conn.query<ResultSetHeader>('INSERT INTO rewards ...', [...]);
 *     await conn.query('UPDATE items SET status = ? WHERE id = ?', [...]);
 *     return r.insertId;
 * });
 */
export async function transaction<T>(
    fn: (conn: TransactionConnection) => Promise<T>
): Promise<T> {
    const conn = await beginTransaction();
    try {
        const result = await fn(conn);
        await conn.commit();
        return result;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}
