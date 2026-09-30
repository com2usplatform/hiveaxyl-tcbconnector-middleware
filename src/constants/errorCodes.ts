export const ERROR_CODES = {
    // 게이트웨이 신뢰경계 검증 실패(헤더/aud/projectIndex 누락·형식)는 정상 흐름에서 발생하지 않으므로,
    // 무엇이 빠졌는지 구분해 노출하지 않고 단일 BAD_REQUEST 로 통일한다(정찰 오라클 차단).
    BAD_REQUEST: 'BAD_REQUEST',
    // 핸들러의 비즈니스 파라미터 검증 실패 (개발자가 의도적으로 사용)
    INVALID_PARAMETER: 'INVALID_PARAMETER',
    // 처리되지 않은 예외 (내부 정보 비노출)
    INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];