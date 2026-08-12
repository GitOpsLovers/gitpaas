import { randomUUID } from 'node:crypto';

/**
 * Longest inbound value accepted before a fresh id is generated instead.
 */
const MAX_REQUEST_ID_LENGTH = 128;

/**
 * Use case for resolving the correlation id of a request
 *
 * @param inbound Raw `X-Request-Id` header value
 *
 * @returns The correlation id to use for the request
 */
export function resolveRequestIdUseCase(inbound: unknown): string {
    const raw = Array.isArray(inbound) ? inbound[0] : inbound;

    if (typeof raw !== 'string') {
        return randomUUID();
    }

    const value = raw.trim();

    if (value.length === 0 || value.length > MAX_REQUEST_ID_LENGTH) {
        return randomUUID();
    }

    return value;
}
