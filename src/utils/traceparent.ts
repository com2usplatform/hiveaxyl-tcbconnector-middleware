import { randomBytes } from 'crypto';

const TRACE_ID_RE = /^[0-9a-f]{32}$/i;

/**
 * W3C traceparent 헤더에서 trace-id(32 hex)를 추출합니다.
 *
 * 형식: `version-traceid-parentid-flags`
 * 예시: `00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`
 *
 * 누락·형식 오류·all-zero trace-id 인 경우 null 을 반환합니다.
 */
export function parseTraceId(traceparent?: unknown): string | null {
    if (typeof traceparent !== 'string') return null;

    const parts = traceparent.trim().split('-');
    if (parts.length < 4) return null;

    const traceId = parts[1];
    if (traceId === undefined || !TRACE_ID_RE.test(traceId) || /^0{32}$/.test(traceId)) {
        return null;
    }

    return traceId.toLowerCase();
}

/**
 * 새 trace-id(32 hex)를 생성합니다.
 */
export function generateTraceId(): string {
    return randomBytes(16).toString('hex');
}

/**
 * traceparent 에서 trace-id 를 얻거나, 유효하지 않으면 새로 생성합니다.
 *
 * Gateway 를 거친 요청은 항상 유효한 traceparent 를 가지지만,
 * 로컬 실행·직접 호출 등 Gateway 외 경로를 위해 fallback 생성합니다.
 */
export function resolveTraceId(traceparent?: unknown): string {
    return parseTraceId(traceparent) ?? generateTraceId();
}
