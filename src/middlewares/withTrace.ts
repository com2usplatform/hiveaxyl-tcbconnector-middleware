import { resolveTraceId } from '../utils/traceparent';
import { AxylContext, AxylHandler, AxylHttpEvent } from '../types';

/**
 * W3C `traceparent` 헤더의 trace-id 를 context.traceId 에 주입합니다.
 *
 * - 헤더에 유효한 `traceparent` 가 있으면 trace-id(32 hex)를 사용합니다.
 * - 없거나 형식이 올바르지 않으면 새 trace-id 를 생성합니다(로컬 실행·직접 호출 대비).
 *
 * traceId 는 로그 상관관계·분산 추적 용도이며, 요청·hop 마다 값이 달라질 수 있어
 * 보안 의사결정이나 멱등성 키로 사용하지 않습니다.
 */
export function withTrace<
    TEvent extends AxylHttpEvent,
    TContext extends AxylContext,
    TResult
>(
    handler: AxylHandler<TEvent, TContext, TResult>
): AxylHandler<TEvent, TContext, TResult> {
    return async (event: TEvent, context: TContext) => {
        const traceId = resolveTraceId(event.headers?.traceparent);

        const nextContext = {
            ...context,
            traceId
        } as TContext;

        return handler(event, nextContext);
    };
}
