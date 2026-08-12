// eslint-disable-next-line @typescript-eslint/no-redeclare
import type { NextFunction, Request, Response } from 'express';

import { REQUEST_ID_HEADER, requestIdMiddleware, resolveRequestId } from '../request-id.middleware';

/** RFC 4122 shape of a generated correlation id. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Builds the request/response/next trio the middleware works with.
 */
function buildContext(headers: Record<string, unknown> = {}) {
    const request = { headers } as unknown as Request;
    const mockSetHeader = jest.fn();
    const response = { setHeader: mockSetHeader } as unknown as Response;
    const next = jest.fn() as unknown as NextFunction;

    return { request, response, next, mockSetHeader };
}

describe('resolveRequestId', () => {
    it('keeps a sane inbound id', () => {
        expect(resolveRequestId('abc-123')).toBe('abc-123');
    });

    it('trims the inbound id', () => {
        expect(resolveRequestId('  abc-123  ')).toBe('abc-123');
    });

    it('keeps the first value of a repeated header', () => {
        expect(resolveRequestId(['first', 'second'])).toBe('first');
    });

    it('generates a UUID when there is no inbound id', () => {
        expect(resolveRequestId(undefined)).toMatch(UUID_PATTERN);
    });

    it('generates a UUID for a blank inbound id', () => {
        expect(resolveRequestId('   ')).toMatch(UUID_PATTERN);
    });

    it('generates a UUID for an oversized inbound id', () => {
        expect(resolveRequestId('x'.repeat(129))).toMatch(UUID_PATTERN);
    });

    it('generates a UUID for a non-string inbound value', () => {
        expect(resolveRequestId(42)).toMatch(UUID_PATTERN);
    });

    it('generates a different id on each call', () => {
        expect(resolveRequestId(undefined)).not.toBe(resolveRequestId(undefined));
    });
});

describe('requestIdMiddleware', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('stamps a generated id on the request and the response, then continues', () => {
        const { request, response, next, mockSetHeader } = buildContext();

        requestIdMiddleware(request, response, next);

        const requestId = request.headers[REQUEST_ID_HEADER] as string;

        expect(requestId).toMatch(UUID_PATTERN);
        expect(mockSetHeader).toHaveBeenCalledWith('X-Request-Id', requestId);
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('honours an inbound X-Request-Id', () => {
        const { request, response, next, mockSetHeader } = buildContext({
            [REQUEST_ID_HEADER]: 'client-supplied',
        });

        requestIdMiddleware(request, response, next);

        expect(request.headers[REQUEST_ID_HEADER]).toBe('client-supplied');
        expect(mockSetHeader).toHaveBeenCalledWith('X-Request-Id', 'client-supplied');
    });

    it('replaces an unusable inbound X-Request-Id', () => {
        const { request, response, next } = buildContext({ [REQUEST_ID_HEADER]: '' });

        requestIdMiddleware(request, response, next);

        expect(request.headers[REQUEST_ID_HEADER]).toMatch(UUID_PATTERN);
    });
});
