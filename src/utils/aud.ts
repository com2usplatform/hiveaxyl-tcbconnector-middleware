import { AxylAudParts } from '../types';
import { AxylMiddlewareError } from '../errors';
import { ERROR_CODES } from '../constants/errorCodes';

export function parseAxylAud(aud: string): AxylAudParts {
    const parts = aud.split('-');

    // 표준 에러는 code 로만 구분하고 message 는 일반화한다(내부 형식 노출 방지).
    if (parts.length !== 3) {
        throw new AxylMiddlewareError(ERROR_CODES.BAD_REQUEST, 'Bad request.');
    }

    const [appIndex, projectIndex, companyIndex] = parts;

    if (!appIndex || !projectIndex || !companyIndex) {
        throw new AxylMiddlewareError(ERROR_CODES.BAD_REQUEST, 'Bad request.');
    }

    if (!/^\d+$/.test(appIndex) || !/^\d+$/.test(projectIndex) || !/^\d+$/.test(companyIndex)) {
        throw new AxylMiddlewareError(ERROR_CODES.BAD_REQUEST, 'Bad request.');
    }

    const parsed = {
        appIndex: parseInt(appIndex, 10),
        projectIndex: parseInt(projectIndex, 10),
        companyIndex: parseInt(companyIndex, 10)
    };

    // projectIndex 는 데이터 격리 키로 쓰인다 — 자리수 무제한 입력이 정밀도 손실로
    // 서로 다른 값이 같은 숫자가 되거나(2^53 초과) Infinity 가 되는 것을 여기서 막는다.
    if (!Number.isSafeInteger(parsed.appIndex)
        || !Number.isSafeInteger(parsed.projectIndex)
        || !Number.isSafeInteger(parsed.companyIndex)) {
        throw new AxylMiddlewareError(ERROR_CODES.BAD_REQUEST, 'Bad request.');
    }

    return parsed;
}
