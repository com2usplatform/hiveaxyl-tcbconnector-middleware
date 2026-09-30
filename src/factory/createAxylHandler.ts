import {ERROR_CODES} from '../constants/errorCodes';
import {AxylError, AxylMiddlewareError} from '../errors';
import {withHiveHeaders} from '../middlewares/withHiveHeaders';
import {withLogger} from '../middlewares/withLogger';
import {resolveTraceId} from '../utils/traceparent';
import {
    AxylBaseHandler,
    AxylContext,
    AxylHttpEvent,
    AxylResponse,
    AxylResponseMetadata,
    CreateAxylHandlerOptions
} from '../types';

function buildMetadata(
    context: AxylContext,
    elapsedMs: number
): AxylResponseMetadata {
    return {
        ...(typeof context.traceId === 'string'
            ? { traceId: context.traceId }
            : {}),
        elapsedMs
    };
}

export function createAxylHandler<
    TEvent extends AxylHttpEvent,
    TData
>(
    baseHandler: AxylBaseHandler<TEvent, TData>,
    options: CreateAxylHandlerOptions<TEvent> = {}
): (event: TEvent, context: unknown) => Promise<AxylResponse<TData>> {
    const wrapped = withLogger<TEvent, AxylContext, TData>(
        withHiveHeaders(
            baseHandler,
            options.hiveHeaders ?? {}
        ),
        options.logger,
        { logEvent: options.logEvent }
    );

    return async (event: TEvent, context: unknown): Promise<AxylResponse<TData>> => {
        const startedAt = Date.now();
        const contextObject: AxylContext = (context ?? {}) as AxylContext;

        // W3C traceparent 의 trace-id 를 추출하고, 없으면 새로 생성합니다.
        contextObject.traceId = resolveTraceId(event.headers?.traceparent);

        try {
            const data = await wrapped(event, contextObject);
            const elapsedMs = Date.now() - startedAt;

            return {
                success: true,
                code: options.successCode ?? 'OK',
                metadata: buildMetadata(contextObject, elapsedMs),
                data
            };
        } catch (error) {
            const elapsedMs = Date.now() - startedAt;
            const isKnown =
                error instanceof AxylMiddlewareError || error instanceof AxylError;

            return {
                success: false,
                code: isKnown ? error.code : ERROR_CODES.INTERNAL_ERROR,
                metadata: buildMetadata(contextObject, elapsedMs),
                error: {
                    // 처리되지 않은 예외의 원문(내부 host·SQL 등)은 클라이언트에 내보내지 않는다.
                    // 원문 message 는 withLogger 의 'function failed' 로그에만 남는다.
                    message: isKnown ? error.message : 'Internal server error'
                }
            };
        }
    };
}