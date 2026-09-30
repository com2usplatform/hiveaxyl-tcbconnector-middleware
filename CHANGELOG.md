# Changelog

## 4.3.0

이 패키지명(@com2usplatform/hiveaxyl-tcbconnector-middleware)으로의 최초 공개. (이전 패키지명 @axyl-tcb/middleware 로 게시된 4.2.1 대비 아래가 달라졌습니다)

- 기본 로거가 요청 event 원문(인증 헤더, 본문)을 기록하지 않습니다. 시작 로그에는 traceId, httpMethod, path, playerId, aud 메타데이터만 남기며, 원문 로깅은 createAxylHandler 의 logEvent 옵션으로 명시적으로 켭니다.
- 처리되지 않은 예외의 응답 message 를 고정 문구(Internal server error)로 마스킹합니다. 원문은 서버 로그에만 남습니다. AxylError / AxylMiddlewareError 의 도메인 message 는 종전대로 응답에 포함됩니다.
- /db, /docdb, /storage 서브패스가 사용하는 mysql2, @cloudbase/node-sdk 를 optional peerDependencies 로 선언했습니다.
- transaction() 에서 ROLLBACK 이 실패해도 원래 오류(콜백/COMMIT)를 그대로 던집니다. 롤백까지 실패한 커넥션은 상태를 알 수 없으므로 풀에 반환하지 않고 파기합니다.
- X-Hive-Aud 의 각 인덱스에 안전 정수(Number.isSafeInteger) 검증을 추가했습니다. 정밀도 손실이 생기는 자리수의 값은 BAD_REQUEST 로 거부됩니다.
- deleteFiles() 가 SDK 응답 코드를 확인해, 하나라도 삭제되지 않으면 예외를 던집니다. (종전에는 실패해도 정상 반환)
- typesVersions 를 선언해 moduleResolution node10 환경에서도 /db, /docdb, /storage 서브패스의 타입이 해석됩니다.
- npm 패키지에 CHANGELOG.md 를 포함합니다.

## 4.2.1

이전 패키지명 @axyl-tcb/middleware 로 npm 에 게시된 버전입니다.

- Axyl TCB Cloud Function 개발용 JavaScript 미들웨어입니다.
- Hive 인증 헤더 검증(withHiveHeaders)과 표준 핸들러 래퍼(createAxylHandler)를 제공합니다.
- MySQL(트랜잭션·멱등 재시도 queryIdempotent), Document DB, Cloud Storage 헬퍼를 포함합니다.
