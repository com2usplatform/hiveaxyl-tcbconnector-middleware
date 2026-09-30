import cloudbase from '@cloudbase/node-sdk';

/**
 * TCB Document DB (문서형 NoSQL) 클라이언트
 *
 * 모듈 레벨에서 초기화해 Cold Start 이후 동일 인스턴스를 재사용합니다.
 * TCB Cloud Function 내부에서 실행 시 secretId/secretKey 없이
 * 함수 자체 권한으로 인증됩니다.
 *
 * 환경 바인딩:
 *   TCB_ENV_ID 가 설정돼 있으면 해당 환경, 없으면 SYMBOL_CURRENT_ENV 로
 *   현재 함수가 실행 중인 환경에 바인딩합니다.
 *   (env 를 비워두면 SDK 가 DB 리소스를 찾지 못해 "resource not found" 가 납니다)
 *
 * 관계형(MySQL)과의 선택 기준은 MCP 문서 tcb-feature-docdb 를 참고하세요.
 *
 * keepalive — 매 연산이 HTTPS 요청이므로 커넥션 재사용으로 핸드셰이크 비용·연결류 오류를 줄입니다.
 * retries   — SDK 는 연결이 성립되지 않은 안전 오류(ENOTFOUND/ECONNREFUSED/연결단계 ETIMEDOUT 등)만
 *             재시도하므로, 비멱등 연산(add, inc)에도 켜도 안전합니다.
 *             (응답 단계 ECONNRESET 은 요청이 이미 실행됐을 수 있어 SDK 가 의도적으로 재시도하지 않음)
 */
const app = cloudbase.init({
    env: process.env.TCB_ENV_ID || cloudbase.SYMBOL_CURRENT_ENV,
    keepalive: true,
    retries: 2,
});

/**
 * 문서형 데이터베이스(MongoDB판) 인스턴스
 *
 * MongoDB판은 인스턴스(instance)와 데이터베이스(database) 이름을 지정해야 합니다.
 * 콘솔 → 문서형 데이터베이스 상단의 인스턴스/DB 드롭다운 값과 일치시킵니다.
 *   TCB_DOCDB_INSTANCE — 인스턴스 이름 (예: axyl_tcb_mongo)
 *   TCB_DOCDB_DATABASE — 데이터베이스 이름 (예: axyl)
 * 미설정 시 기본값(레거시 문서형 DB)으로 동작합니다.
 */
const dbConfig: { instance?: string; database?: string } = {};
if (process.env.TCB_DOCDB_INSTANCE) dbConfig.instance = process.env.TCB_DOCDB_INSTANCE;
if (process.env.TCB_DOCDB_DATABASE) dbConfig.database = process.env.TCB_DOCDB_DATABASE;

export const db = app.database(dbConfig);

/**
 * 쿼리·갱신 연산자 (db.command)
 *
 * 비교: gt, lt, gte, lte, eq, neq, in, nin
 * 논리: and, or
 * 갱신: inc, mul, push, pop, remove
 *
 * @example
 * import { collection, command } from '../lib/docdb';
 * await collection('notes').where({ level: command.gte(10) }).get();
 */
export const command = db.command;

/**
 * 컬렉션 참조 헬퍼
 *
 * @param name  컬렉션 이름
 * @example const notes = collection('notes');
 */
export function collection(name: string) {
    return db.collection(name);
}
