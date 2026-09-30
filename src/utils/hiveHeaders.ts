import { AxylHeaders, AxylHiveHeaders, AxylHttpEvent } from '../types';

function pickHiveHeader(
    headers: AxylHeaders,
    key: keyof AxylHiveHeaders
): string | undefined {
    const value = headers[key];
    return typeof value === 'string' && value ? value : undefined;
}

export function getHiveHeaders(event: AxylHttpEvent): Partial<AxylHiveHeaders> {
    const headers = event.headers ?? {};

    const playerId = pickHiveHeader(headers, 'X-Hive-Player-Id');
    const aud = pickHiveHeader(headers, 'X-Hive-Aud');

    return {
        ...(playerId !== undefined ? { 'X-Hive-Player-Id': playerId } : {}),
        ...(aud !== undefined ? { 'X-Hive-Aud': aud } : {})
    };
}