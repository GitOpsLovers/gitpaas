import { randomUUID } from 'node:crypto';

// eslint-disable-next-line @typescript-eslint/no-redeclare
import type { NextFunction, Request, Response } from 'express';

/**
 * Longest inbound value accepted before a fresh id is generated instead.
 */
const MAX_REQUEST_ID_LENGTH = 128;

/**
 * Header carrying the correlation id, both inbound and outbound.
 */
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Resolves the correlation id of a request.
 *
 * @param inbound Raw `X-Request-Id` header value
 *
 * @returns The correlation id to use for the request
 */
export function resolveRequestId(inbound: unknown): string {
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

/**
 * Global middleware that stamps every request with a correlation id.
 *
 * @param request Incoming request
 * @param response Outgoing response
 * @param next Next middleware in the chain
 */
export function requestIdMiddleware(request: Request, response: Response, next: NextFunction): void {
    // eslint-disable-next-line security/detect-object-injection
    const requestId = resolveRequestId(request.headers[REQUEST_ID_HEADER]);

    // eslint-disable-next-line security/detect-object-injection
    request.headers[REQUEST_ID_HEADER] = requestId;
    response.setHeader('X-Request-Id', requestId);

    next();
}
