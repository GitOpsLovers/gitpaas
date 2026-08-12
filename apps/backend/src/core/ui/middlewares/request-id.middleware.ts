import { randomUUID } from 'node:crypto';

// eslint-disable-next-line @typescript-eslint/no-redeclare
import type { NextFunction, Request, Response } from 'express';

/** Header carrying the correlation id, both inbound and outbound. */
export const REQUEST_ID_HEADER = 'x-request-id';

/** Longest inbound value accepted before a fresh id is generated instead. */
const MAX_REQUEST_ID_LENGTH = 128;

/**
 * Resolves the correlation id of a request: an inbound `X-Request-Id` is
 * honoured when it is a sane, non-empty single value, otherwise a fresh UUID is
 * generated. A repeated header (array) keeps its first value.
 *
 * @param inbound Raw `X-Request-Id` header value, if any
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
 * Global middleware that stamps every request with a correlation id. The id is
 * written back onto the request headers so the exception filter (and any other
 * downstream consumer) reads a single, already-resolved value, and onto the
 * response headers so the client can quote it when reporting a failure.
 *
 * @param request Incoming request
 * @param response Outgoing response
 * @param next Next middleware in the chain
 */
export function requestIdMiddleware(
    request: Request,
    response: Response,
    next: NextFunction,
): void {
    const requestId = resolveRequestId(request.headers[REQUEST_ID_HEADER]);

    request.headers[REQUEST_ID_HEADER] = requestId;
    response.setHeader('X-Request-Id', requestId);

    next();
}
