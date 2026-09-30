import type { ErrorCode } from './constants/errorCodes';

/**
 * 미들웨어가 보장하는 표준 에러.
 * code 는 ERROR_CODES 의 닫힌 집합(헤더/aud/projectIndex 검증, INVALID_PARAMETER 등)만 사용합니다.
 */
export class AxylMiddlewareError extends Error {
    public readonly code: ErrorCode;

    constructor(code: ErrorCode, message?: string) {
        super(message ?? code);
        this.name = 'AxylMiddlewareError';
        this.code = code;
    }
}

/**
 * 비즈니스 로직에서 발생하는 도메인 에러.
 *
 * code 는 고객이 자유롭게 정의하는 문자열(예: 'INSUFFICIENT_BALANCE')이며,
 * createAxylHandler 가 응답의 code 필드로 그대로 전달합니다.
 * 미들웨어 표준 코드는 AxylMiddlewareError / ERROR_CODES 를 사용하세요.
 */
export class AxylError extends Error {
    public readonly code: string;

    constructor(code: string, message?: string) {
        super(message ?? code);
        this.name = 'AxylError';
        this.code = code;
    }
}