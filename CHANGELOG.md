# Changelog

## 4.3.0

최초 공개. (내부 배포본 4.2.1 대비 아래가 달라졌습니다)

- 기본 로거가 요청 event 원문(인증 헤더, 본문)을 기록하지 않습니다. 시작 로그에는 traceId, httpMethod, path, playerId, aud 메타데이터만 남기며, 원문 로깅은 createAxylHandler 의 logEvent 옵션으로 명시적으로 켭니다.
- 처리되지 않은 예외의 응답 message 를 고정 문구(Internal server error)로 마스킹합니다. 원문은 서버 로그에만 남습니다. AxylError / AxylMiddlewareError 의 도메인 message 는 종전대로 응답에 포함됩니다.
- /db, /docdb, /storage 서브패스가 사용하는 mysql2, @cloudbase/node-sdk 를 optional peerDependencies 로 선언했습니다.

## 4.2.1 (내부 배포)

최초 공개.

- Axyl TCB Cloud Function 개발용 JavaScript 미들웨어입니다.
- Hive 인증 헤더 검증(withHiveHeaders)과 표준 핸들러 래퍼(createAxylHandler)를 제공합니다.
- MySQL(트랜잭션·멱등 재시도 queryIdempotent), Document DB, Cloud Storage 헬퍼를 포함합니다.
