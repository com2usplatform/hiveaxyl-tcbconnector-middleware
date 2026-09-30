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

    return {
        appIndex: parseInt(appIndex, 10),
        projectIndex: parseInt(projectIndex, 10),
        companyIndex: parseInt(companyIndex, 10)
    };
}
