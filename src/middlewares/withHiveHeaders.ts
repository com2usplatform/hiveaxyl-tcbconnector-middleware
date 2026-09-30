import { ERROR_CODES } from '../constants/errorCodes';
import { AxylMiddlewareError } from '../errors';
import {
    AxylAuthorizedContext,
    AxylContext,
    AxylHandler,
    AxylHiveHeaders,
    AxylHttpEvent,
    HiveHeaderOptions
} from '../types';
import { parseAxylAud } from '../utils/aud';
import { getHiveHeaders } from '../utils/hiveHeaders';

export function withHiveHeaders<
    TEvent extends AxylHttpEvent,
    TResult
>(
    handler: AxylHandler<TEvent, AxylAuthorizedContext, TResult>,
    options: HiveHeaderOptions<TEvent> = {}
): AxylHandler<TEvent, AxylContext, TResult> {
    const { extractor } = options;

    // 플랫폼 playerId 규격: BIGINT(최대 19자리) 정수 문자열.
    // 숫자 외 문자를 걸러 DB(BIGINT 컬럼) 오류가 INTERNAL_ERROR 로 둔갑하는 것을 막고,
    // Storage 경로(uploads/{projectIndex}/{playerId}/...) 조립 시 경로 조작('/'·'..')을 원천 차단한다.
    const PLAYER_ID_PATTERN = /^\d{1,19}$/;

    return async (event: TEvent, context: AxylContext) => {
        const injectedHeaders = (extractor
            ? extractor(event)
            : getHiveHeaders(event)) as Partial<AxylHiveHeaders>;

        const playerId = injectedHeaders['X-Hive-Player-Id'];
        const audRaw = injectedHeaders['X-Hive-Aud'];

        // 존재·형식 모두 단일 BAD_REQUEST 로 통일한다 (어떤 검증에 걸렸는지 노출하지 않음).
        if (!playerId || !PLAYER_ID_PATTERN.test(playerId)) {
            throw new AxylMiddlewareError(
                ERROR_CODES.BAD_REQUEST,
                'Bad request.'
            );
        }

        if (!audRaw) {
            throw new AxylMiddlewareError(
                ERROR_CODES.BAD_REQUEST,
                'Bad request.'
            );
        }

        const nextContext: AxylAuthorizedContext = {
            ...context,
            playerId,
            aud: parseAxylAud(audRaw),
            injectedHeaders: {
                'X-Hive-Player-Id': playerId,
                'X-Hive-Aud': audRaw
            }
        };

        return handler(event, nextContext);
    };
}