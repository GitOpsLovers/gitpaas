// eslint-disable-next-line import/no-unassigned-import
import 'reflect-metadata';

import { INJECTABLE_WATERMARK, PARAMTYPES_METADATA, SELF_DECLARED_DEPS_METADATA } from '@nestjs/common/constants';

// eslint-disable-next-line @typescript-eslint/no-redeclare
import type { NextFunction, Request, Response } from 'express';

import { REQUEST_ID_HEADER, RequestIdMiddleware } from '../request-id.middleware';

/** RFC 4122 shape of a generated correlation id. */
const UUID_PATTERN = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/;

/**
 * Builds the request/response/next trio the middleware works with.
 */
function buildContext(headers: Record<string, unknown> = {}) {
    const request = { headers } as unknown as Request;
    const mockSetHeader = jest.fn();
    const response = { setHeader: mockSetHeader } as unknown as Response;
    const next = jest.fn() as unknown as NextFunction;

    return {
        request, response, next, mockSetHeader,
    };
}

describe('RequestIdMiddleware', () => {
    let sut: RequestIdMiddleware;

    beforeEach(() => {
        jest.clearAllMocks();

        sut = new RequestIdMiddleware();
    });

    it('stamps a generated id on the request and the response, then continues', () => {
        const { request, response, next, mockSetHeader } = buildContext();

        sut.use(request, response, next);

        const requestId = request.headers[REQUEST_ID_HEADER] as string;

        expect(requestId).toMatch(UUID_PATTERN);
        expect(mockSetHeader).toHaveBeenCalledWith('X-Request-Id', requestId);
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('honours an inbound X-Request-Id', () => {
        const { request, response, next, mockSetHeader } = buildContext({
            [REQUEST_ID_HEADER]: 'client-supplied',
        });

        sut.use(request, response, next);

        expect(request.headers[REQUEST_ID_HEADER]).toBe('client-supplied');
        expect(mockSetHeader).toHaveBeenCalledWith('X-Request-Id', 'client-supplied');
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('replaces an unusable inbound X-Request-Id', () => {
        const { request, response, next, mockSetHeader } = buildContext({ [REQUEST_ID_HEADER]: '' });

        sut.use(request, response, next);

        const requestId = request.headers[REQUEST_ID_HEADER] as string;

        expect(requestId).toMatch(UUID_PATTERN);
        expect(mockSetHeader).toHaveBeenCalledWith('X-Request-Id', requestId);
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('replaces an oversized inbound X-Request-Id', () => {
        const { request, response, next, mockSetHeader } = buildContext({
            [REQUEST_ID_HEADER]: 'x'.repeat(129),
        });

        sut.use(request, response, next);

        const requestId = request.headers[REQUEST_ID_HEADER] as string;

        expect(requestId).toMatch(UUID_PATTERN);
        expect(mockSetHeader).toHaveBeenCalledWith('X-Request-Id', requestId);
    });

    it('is marked injectable, so the container can build it as a provider', () => {
        expect(Reflect.getMetadata(INJECTABLE_WATERMARK, RequestIdMiddleware)).toBe(true);
    });

    it('declares no constructor dependency, so the container needs no other provider', () => {
        expect(Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, RequestIdMiddleware)).toBeUndefined();
        expect((Reflect.getMetadata(PARAMTYPES_METADATA, RequestIdMiddleware) as unknown[]) ?? []).toEqual([]);
        expect(RequestIdMiddleware).toHaveLength(0);
    });
});
