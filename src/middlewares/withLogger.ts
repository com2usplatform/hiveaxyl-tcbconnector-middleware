import { AxylContext, AxylHandler, AxylLogger } from '../types';

function createDefaultLogger(): AxylLogger {
    return {
        info: (message: string, meta?: unknown) => {
            console.log('[INFO]', message, meta ?? '');
        },
        error: (message: string, meta?: unknown) => {
            console.error('[ERROR]', message, meta ?? '');
        }
    };
}

export interface WithLoggerOptions {
    /**
     * true 면 시작 로그에 event 원문을 포함합니다.
     * 원문에는 Authorization 등 인증 헤더와 요청 본문(파일 base64, PII)이 실릴 수 있어
     * 기본값은 false 이며, 디버깅 등 필요한 경우에만 명시적으로 켭니다.
     */
    logEvent?: boolean | undefined;
}

function headerOf(event: unknown, name: string): string | undefined {
    const headers = (event as { headers?: Record<string, unknown> } | null | undefined)?.headers;
    if (!headers || typeof headers !== 'object') return undefined;
    const key = Object.keys(headers).find((k) => k.toLowerCase() === name);
    const value = key ? headers[key] : undefined;
    return typeof value === 'string' ? value : undefined;
}

/** 시작 로그용 안전 메타데이터 — 식별·추적에 필요한 값만 추리고 헤더·본문 원문은 제외한다. */
function startMeta(event: unknown, context: AxylContext): Record<string, unknown> {
    const candidate: Record<string, unknown> = {
        traceId: context.traceId,
        httpMethod: (event as { httpMethod?: unknown } | null | undefined)?.httpMethod,
        path: (event as { path?: unknown } | null | undefined)?.path,
        playerId: headerOf(event, 'x-hive-player-id'),
        aud: headerOf(event, 'x-hive-aud')
    };
    const meta: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(candidate)) {
        if (v !== undefined) meta[k] = v;
    }
    return meta;
}

export function withLogger<
    TEvent,
    TContext extends AxylContext,
    TResult
>(
    handler: AxylHandler<TEvent, TContext, TResult>,
    logger?: AxylLogger,
    options: WithLoggerOptions = {}
): AxylHandler<TEvent, TContext, TResult> {
    return async (event: TEvent, context: TContext) => {
        const resolvedLogger = logger ?? context.logger ?? createDefaultLogger();

        const nextContext = {
            ...context,
            logger: resolvedLogger
        } as TContext;

        // 기본은 안전 메타만 — event 원문(인증 헤더·본문)은 logEvent 옵트인 시에만 남긴다
        resolvedLogger.info(
            'function start',
            options.logEvent ? { event } : startMeta(event, context)
        );

        try {
            const result = await handler(event, nextContext);
            resolvedLogger.info('function success');
            return result;
        } catch (error) {
            resolvedLogger.error('function failed', {
                error: error instanceof Error
                    ? error.message
                    : JSON.stringify(error)
            });
            throw error;
        }
    };
}
