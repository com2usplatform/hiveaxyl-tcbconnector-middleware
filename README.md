# @com2usplatform/hiveaxyl-tcbconnector-middleware

> **Com2uS Platform Official** · Canonical: <https://github.com/com2usplatform/hiveaxyl-tcbconnector-middleware>
> Product: `hiveaxyl` · Domain: `tcbconnector` · Version: 4.3.0 · Lifecycle: preparing
> 관련 저장소: [hiveaxyl-tcbconnector-template](https://github.com/com2usplatform/hiveaxyl-tcbconnector-template)

Hive Axyl TCB Connector Cloud Function 템플릿에서 공통으로 사용하는 Gateway 주입 헤더 기반 컨텍스트 미들웨어 패키지입니다.

이 패키지는 Cloud Function 진입점에서 Gateway가 주입한 `X-Hive-*` 헤더를 읽고, 필요한 컨텍스트를 생성해 `baseHandler` 에 전달하며, 최종 응답을 Axyl 표준 포맷으로 강제합니다.

## 목적

`hiveaxyl-tcbconnector-middleware` 는 다음 책임을 가집니다.

- Gateway가 주입한 `X-Hive-Player-Id`, `X-Hive-Aud` 헤더 추출
- `X-Hive-Aud` 파싱 및 컨텍스트 주입
- 공통 로깅 처리
- 템플릿에서는 `baseHandler` 만 구현하면 되도록 handler factory 제공
- 성공/실패 응답을 Axyl 표준 포맷으로 강제

## 타입 설계 원칙

이 패키지는 다음 3가지를 분리합니다.

- **ReqDTO**: 사용자가 입력으로 받는 비즈니스 요청 값
- **ResDTO**: 사용자가 반환하는 비즈니스 응답 값
- **Context**: middleware가 주입하는 런타임 값

즉 `playerId`, `aud` 같은 값은 ReqDTO/ResDTO가 아니라 **Context의 필수 필드**입니다.

## 제공되는 컨텍스트(context) 값

`baseHandler` 는 헤더를 직접 다루지 않습니다. 미들웨어가 검증·주입한 아래 `context` 값만 사용하면 됩니다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `playerId` | string | 호출 플레이어 ID (형식 `^\d{1,19}$` 검증 완료, 항상 존재). 플랫폼 BIGINT 규격이므로 JS `number` 로 파싱하지 말 것(정밀도 손실) |
| `aud.appIndex` · `aud.projectIndex` · `aud.companyIndex` | number | 파싱된 인덱스. **데이터 격리에는 신뢰값 `aud.projectIndex` 를 사용** |
| `traceId` | string | 로그 상관관계용 trace-id (없으면 자동 생성) |
| `logger` | AxylLogger | `info` / `error` 로깅 |

> `traceId` 는 observability(추적) 전용입니다. 보안 판단이나 멱등성 키로 사용하지 않습니다.

## 주요 기능

- `withTrace`
  - 이벤트 헤더의 `traceparent` 에서 trace-id(32 hex)를 추출해 `context.traceId` 에 주입
  - `traceparent` 가 없거나 형식이 올바르지 않으면 새 trace-id 를 자동 생성 (로컬 실행·직접 호출 대비)
  - 성공/실패 응답의 `metadata.traceId` 에 항상 포함됨
  - 로그 상관관계·분산 추적 전용 — 보안 판단·멱등성 키로 사용하지 않음

- `withHiveHeaders`
  - `X-Hive-Player-Id`, `X-Hive-Aud` 헤더 추출
  - 필수 헤더 검증 + 형식 검증
    - `playerId`: `^\d{1,19}$` (플랫폼 BIGINT 규격 — 숫자 문자열, 최대 19자리). 경로 조작·DB 타입 오류를 신뢰경계에서 차단
    - 존재/형식 위반 모두 단일 `BAD_REQUEST` 로 반환 (세부 사유 비노출)
  - `playerId`, `aud`, `injectedHeaders` 주입
  - `AxylContext` 를 `AxylAuthorizedContext` 로 승격

- `withLogger`
  - 공통 요청/응답 로깅 — 시작 로그에는 `traceId`·`httpMethod`·`path`·`playerId`·`aud` 메타데이터만 남깁니다
  - 인증 헤더(Authorization)와 요청 본문은 기본적으로 기록하지 않으며, 필요 시 `createAxylHandler` 의 `logEvent: true` 로 명시적으로 켭니다

- `createAxylHandler`
  - 미들웨어 조합을 내부에 숨기고 최종 handler 생성
  - 템플릿에서는 `baseHandler` 만 구현하면 되도록 지원
  - 성공/실패 응답을 Axyl 표준 포맷으로 생성

## 응답 포맷

`createAxylHandler` 는 최종 응답을 아래 구조로 강제합니다.

### 성공 응답

```json
{
  "success": true,
  "code": "OK",
  "metadata": {
    "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
    "elapsedMs": 3
  },
  "data": {}
}
```

### 실패 응답

```json
{
  "success": false,
  "code": "BAD_REQUEST",
  "metadata": {
    "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
    "elapsedMs": 1
  },
  "error": {
    "message": "Bad request."
  }
}
```

즉 `baseHandler` 는 최종 응답 전체를 만들지 않고, **비즈니스 `data` 만 반환**하면 됩니다.

## 설치

공개 npm 패키지이므로 별도 레지스트리 설정이나 인증 없이 바로 설치할 수 있습니다.

```bash
npm install @com2usplatform/hiveaxyl-tcbconnector-middleware
```

코어(헤더/컨텍스트 처리)는 의존성이 없습니다.

## DB / Storage / Document DB 헬퍼 (subpath)

mysql2·TCB Cloud Storage·Document DB 클라이언트를 subpath 로 제공합니다. 라이브러리로 관리되므로 수정·보안 패치가 `npm update` 로 전파됩니다.

```ts
import { pool, transaction }              from '@com2usplatform/hiveaxyl-tcbconnector-middleware/db';      // mysql2
import { uploadFile, getTempURL }         from '@com2usplatform/hiveaxyl-tcbconnector-middleware/storage';  // Cloud Storage
import { db, command, collection }        from '@com2usplatform/hiveaxyl-tcbconnector-middleware/docdb';    // Document DB
```

이 subpath 들은 `mysql2` / `@cloudbase/node-sdk` 를 직접 require 하지만, 미들웨어가 **자동 설치하지 않습니다**(헤더만 쓰는 사용자에게 불필요한 의존성·취약점을 부과하지 않기 위함). 사용하는 subpath 의 패키지를 **직접 설치**하세요.

```bash
npm install mysql2              # /db 사용 시
npm install @cloudbase/node-sdk # /storage, /docdb 사용 시
```

> 설치하지 않고 subpath 를 import 하면 런타임에 모듈을 찾지 못합니다. (Axyl 템플릿으로 생성한 프로젝트는 필요한 패키지를 이미 선언합니다.)

| subpath | 필요 peer | 환경변수 |
|---|---|---|
| `/db` | `mysql2` | `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` |
| `/storage` | `@cloudbase/node-sdk` | `TCB_ENV_ID`(미설정 시 현재 함수 환경) |
| `/docdb` | `@cloudbase/node-sdk` | `TCB_ENV_ID` · `TCB_DOCDB_INSTANCE` · `TCB_DOCDB_DATABASE` |

> 헤더/컨텍스트만 쓰는 사용자는 이 패키지들을 설치하지 않으므로, 코어는 가볍게 유지되고 관련 보안 advisory 도 부과되지 않습니다.

## 프로젝트 구조

```text
hiveaxyl-tcbconnector-middleware/
├─ src/
│  ├─ constants/
│  │  └─ errorCodes.ts
│  ├─ factory/
│  │  └─ createAxylHandler.ts
│  ├─ lib/
│  │  ├─ db.ts        # /db — MySQL 풀·transaction·queryIdempotent
│  │  ├─ docdb.ts     # /docdb — Document DB 클라이언트·연산자
│  │  └─ storage.ts   # /storage — Cloud Storage 헬퍼
│  ├─ middlewares/
│  │  ├─ withHiveHeaders.ts
│  │  ├─ withLogger.ts
│  │  └─ withTrace.ts
│  ├─ utils/
│  │  ├─ aud.ts
│  │  ├─ hiveHeaders.ts
│  │  └─ traceparent.ts
│  ├─ errors.ts
│  ├─ index.ts
│  └─ types.ts
```

## 사용 예시

템플릿 프로젝트에서는 `baseHandler` 만 구현하고, `createAxylHandler` 로 최종 `main` 을 생성하면 됩니다.

`baseHandler` 는 Gateway 헤더를 직접 다루지 않습니다.  
`X-Hive-Player-Id`, `X-Hive-Aud` 는 middleware 가 읽고 `AxylAuthorizedContext` 로 전달합니다.  
이벤트 타입은 `AxylHttpEvent` 를 확장해 정의합니다 — `headers` 등 공통 필드 타입이 따라오고, 비즈니스 필드만 추가하면 됩니다.

```ts
import {
  createAxylHandler,
  type AxylHttpEvent
} from '@com2usplatform/hiveaxyl-tcbconnector-middleware';

interface HelloEvent extends AxylHttpEvent {
  message?: string;
}

interface HelloResDto {
  echo: string;
}

export const main = createAxylHandler<HelloEvent, HelloResDto>(async (event, context) => {
  context.logger?.info('business logic', {
    playerId: context.playerId,
    projectIndex: context.aud.projectIndex
  });

  return {
    echo: event.message ?? 'hello'
  };
});
```

## 실제 요청 payload 예시

Gateway 또는 테스트 호출에서는 실제로 `headers` 가 포함될 수 있습니다.

```json
{
  "headers": {
    "X-Hive-Player-Id": "9999999999991",
    "X-Hive-Aud": "10-1001-5"
  },
  "message": "hello axyl"
}
```

## createAxylHandler 기본 동작

`createAxylHandler` 는 내부적으로 아래 순서로 처리합니다.

1. `traceId` 결정 (`traceparent` 헤더의 trace-id 추출, 없으면 자동 생성)
2. `withLogger`
3. `withHiveHeaders`

기본 정책은 다음과 같습니다.

- `traceparent` 헤더의 trace-id 를 사용, 없거나 형식 오류면 새 trace-id 자동 생성
- `X-Hive-Player-Id`, `X-Hive-Aud` 는 기본적으로 필수
- 성공 응답의 `code` 는 기본적으로 `OK`
- 필요 시 `successCode` 옵션으로 변경 가능

예:

```ts
createAxylHandler(baseHandler, {
  successCode: 'CUSTOM_OK'
});
```

## 공개 API

현재 외부로 공개하는 주요 API는 다음과 같습니다.

- `createAxylHandler`
- `withHiveHeaders`
- `withLogger`
- `withTrace`
- `AxylError` — 도메인 오류(코드·메시지가 응답으로 전달됨)

서브패스 API:

- `/db` — `pool`, `transaction`, `queryIdempotent`
- `/docdb` — `db`, `command`, `collection`
- `/storage` — `uploadFile`, `getTempURL` 등 Cloud Storage 헬퍼

주요 타입:

- `AxylBaseHandler`
- `AxylContext`
- `AxylAuthorizedContext`
- `AxylHttpEvent`
- `AxylHiveHeaders`
- `AxylAudParts`
- `AxylResponseMetadata`
- `AxylSuccessResponse`
- `AxylErrorResponse`
- `AxylResponse`
- `CreateAxylHandlerOptions`

## 테스트 범위

테스트 스위트는 내부 소스 저장소에서 관리하며, 이 공개 저장소에는 포함되지 않습니다.
모든 릴리스는 게시 전 CI(required check `test`)에서 아래 범위의 테스트를 통과합니다.

- `parseAxylAud`
- `getHiveHeaders`
- `withHiveHeaders`
- `withLogger`
- `withTrace`
- `createAxylHandler`

## 참고

- 이 패키지는 Cloud Function 비즈니스 로직이 아니라 헤더 추출/주입/공통 처리에 집중합니다.
- 현재는 `X-Hive-Player-Id`, `X-Hive-Aud` 만 사용합니다.
- `aud` 의 비즈니스 검증(예: 게임 정보 DB 조회 기반 검증)은 제품 책임입니다.

## 보안 전제 (헤더 신뢰 경계)

`withHiveHeaders` 는 `X-Hive-Player-Id` / `X-Hive-Aud` 의 **존재와 형식만 검사**하며 서명을 검증하지 않습니다.
이 헤더들은 **Hive Gateway 가 주입하고, 함수가 Gateway 를 거치지 않는 외부 직접 호출로 노출되지 않는 환경을 전제**합니다.
함수 URL 을 외부에 직접 공개하는 구성에서는 헤더를 위조해 다른 플레이어로 행세할 수 있으므로, 그런 경로에는 별도 인증(예: 1회용 티켓)을 두어야 합니다.

- 처리되지 않은 예외의 응답 `message` 는 `Internal server error` 로 고정됩니다. 내부 정보(DB host, SQL 오류 등)는 서버 로그에만 남습니다. 사용자에게 보여줄 오류는 `AxylError(code, message)` 로 던지세요.

## 문의와 기여 (Support)

이 저장소의 **GitHub Issues 는 사용하지 않으며**, GitHub 은 공식 고객 지원 채널이 아닙니다. 아래 채널을 이용해 주세요.

| 용도 | 채널 |
|---|---|
| 제품 정보 | <https://hiveplatform.ai/hiveaxyl> |
| 개발자 문서 | <https://developers.hiveplatform.ai/axyl/ko/> |
| 사용 문의·버그 제보·기능 요청 | <cs-platform@com2us.com> |

- **외부 Pull Request 는 검토·병합하지 않습니다** — [CONTRIBUTING.md](https://github.com/com2usplatform/hiveaxyl-tcbconnector-middleware/blob/main/CONTRIBUTING.md) 참고.
- 보안 취약점은 [SECURITY.md](https://github.com/com2usplatform/hiveaxyl-tcbconnector-middleware/blob/main/SECURITY.md) 의 비공개 채널로만 신고해 주세요.
