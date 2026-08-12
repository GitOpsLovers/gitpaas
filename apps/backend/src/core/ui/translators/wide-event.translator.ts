import { hostname } from 'node:os';

// eslint-disable-next-line @typescript-eslint/no-redeclare
import type { Request } from 'express';

import { resolveRequestIdUseCase } from '../../application/resolve-request-id.use-case';
import { HTTP_REQUEST_EVENT_NAME, WIDE_EVENT_SERVICE_NAME, WIDE_EVENT_UNKNOWN_VERSION } from '../../domain/constants/wide-event.constants';
import type { WideEvent } from '../../domain/models/wide-event.models';
import { REQUEST_ID_HEADER } from '../middlewares/request-id.middleware';

/**
 * Reads the first value of a header that Express may give as a list.
 *
 * @param value Raw header value
 *
 * @returns The header value, or `undefined` when there is none
 */
function readHeader(value: string | string[] | undefined): string | undefined {
    const raw = Array.isArray(value) ? value[0] : value;

    return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
}

/**
 * Resolves the declared size of the request body.
 *
 * @param request Incoming request
 *
 * @returns The size in bytes, or `undefined` when the header is absent or unusable
 */
function resolveRequestBytes(request: Request): number | undefined {
    const raw = readHeader(request.headers['content-length']);

    if (raw === undefined) {
        return undefined;
    }

    const bytes = Number(raw);

    return Number.isFinite(bytes) ? bytes : undefined;
}

/**
 * Resolves the low-cardinality route pattern the request matched.
 *
 * @param request Incoming request
 *
 * @returns The route pattern, or `undefined` when no route matched
 */
export function resolveRoute(request: Request): string | undefined {
    const path = (request.route as { path?: unknown } | undefined)?.path;

    if (typeof path !== 'string') {
        return undefined;
    }

    return `${request.baseUrl ?? ''}${path}`;
}

/**
 * Builds the fields known the moment the request enters the middleware chain.
 *
 * @param request Incoming request
 *
 * @returns The seed of the wide event of the request
 */
export function buildWideEventSeed(request: Request): WideEvent {
    // eslint-disable-next-line security/detect-object-injection
    const requestId = resolveRequestIdUseCase(request.headers[REQUEST_ID_HEADER]);
    const userAgent = readHeader(request.headers['user-agent']);
    const requestBytes = resolveRequestBytes(request);

    return {
        timestamp: new Date().toISOString(),
        'event.name': HTTP_REQUEST_EVENT_NAME,
        'service.name': WIDE_EVENT_SERVICE_NAME,
        'service.version': process.env.APP_VERSION ?? WIDE_EVENT_UNKNOWN_VERSION,
        'service.env': process.env.NODE_ENV ?? 'development',
        'host.name': hostname(),
        'process.pid': process.pid,
        'trace.id': requestId,
        'request.id': requestId,
        'http.method': request.method,
        'http.path': request.path,
        'http.query_keys': Object.keys(request.query ?? {}),
        ...(userAgent === undefined ? {} : { 'http.user_agent': userAgent }),
        ...(requestBytes === undefined ? {} : { 'http.request_bytes': requestBytes }),
    };
}
