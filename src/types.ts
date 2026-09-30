export interface AxylLogger {
    info: (message: string, meta?: unknown) => void;
    error: (message: string, meta?: unknown) => void;
}

export interface AxylAudParts {
    appIndex: number;
    projectIndex: number;
    companyIndex: number;
}

export interface AxylHiveHeaders {
    'X-Hive-Player-Id': string;
    'X-Hive-Aud': string;
}

export interface AxylContext {
    /**
     * W3C traceparent 의 trace-id (32 hex). 로그 상관관계·분산 추적 용도.
     * observability 전용이며 보안 판단이나 멱등성 키로 사용하지 않습니다.
     */
    traceId?: string;
    logger?: AxylLogger;
    [key: string]: unknown;
}

export interface AxylAuthorizedContext extends AxylContext {
    playerId: string;
    aud: AxylAudParts;
    injectedHeaders: AxylHiveHeaders;
}

export interface AxylHeaders {
    authorization?: string;
    Authorization?: string;
    'X-Hive-Player-Id'?: string;
    'X-Hive-Aud'?: string;
    /** W3C Trace Context 헤더 (Gateway 가 계승/발급) */
    traceparent?: string;
    [key: string]: unknown;
}

export interface AxylHttpEvent {
    headers?: AxylHeaders;
    body?: unknown;
}

export interface AxylResponseMetadata {
    traceId?: string;
    elapsedMs?: number;
    [key: string]: unknown;
}

export interface AxylSuccessResponse<TData = unknown> {
    success: true;
    code: string;
    metadata: AxylResponseMetadata;
    data: TData;
}

export interface AxylErrorResponse {
    success: false;
    code: string;
    metadata: AxylResponseMetadata;
    error: {
        message: string;
    };
}

export type AxylResponse<TData = unknown> =
    | AxylSuccessResponse<TData>
    | AxylErrorResponse;

export type AxylHandler<
    TEvent = AxylHttpEvent,
    TContext = AxylContext,
    TResult = unknown
> = (
    event: TEvent,
    context: TContext
) => Promise<TResult>;

export type AxylBaseHandler<TReq = AxylHttpEvent, TRes = unknown> = (
    event: TReq,
    context: AxylAuthorizedContext
) => Promise<TRes>;

export interface HiveHeaderOptions<TEvent extends AxylHttpEvent = AxylHttpEvent> {
    extractor?: (event: TEvent) => Partial<AxylHiveHeaders>;
}

export interface CreateAxylHandlerOptions<
    TEvent extends AxylHttpEvent = AxylHttpEvent
> {
    hiveHeaders?: HiveHeaderOptions<TEvent>;
    logger?: AxylLogger;
    successCode?: string;
    /** true 면 시작 로그에 event 원문 포함 — 인증 헤더·본문이 로그에 남으므로 기본 false (withLogger 참고). */
    logEvent?: boolean;
}