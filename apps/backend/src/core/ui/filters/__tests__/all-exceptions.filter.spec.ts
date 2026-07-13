import {
    ArgumentsHost,
    BadRequestException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

import { AllExceptionsFilter } from '../all-exceptions.filter';

/**
 * Builds an `ArgumentsHost` whose HTTP context exposes a fake request/response.
 */
function createHost(request: unknown): ArgumentsHost {
    return {
        switchToHttp: () => ({
            getRequest: () => request,
            getResponse: () => ({}),
        }),
    } as unknown as ArgumentsHost;
}

describe('AllExceptionsFilter', () => {
    let reply: jest.Mock;
    let filter: AllExceptionsFilter;

    beforeEach(() => {
        reply = jest.fn();

        const httpAdapterHost = {
            httpAdapter: {
                getRequestUrl: () => '/api/v1/resource',
                reply,
            },
        } as unknown as HttpAdapterHost;

        filter = new AllExceptionsFilter(httpAdapterHost);

        jest.spyOn(Logger.prototype, 'error').mockImplementation();
        jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('formats an HttpException preserving status code and message', () => {
        const warn = jest.spyOn(Logger.prototype, 'warn');

        filter.catch(new NotFoundException('Item missing'), createHost({}));

        const [, body, status] = reply.mock.calls[0] as [
            unknown,
            Record<string, unknown>,
            number,
        ];

        expect(status).toBe(404);
        expect(body).toMatchObject({
            statusCode: 404,
            message: 'Item missing',
            error: 'Not Found',
            path: '/api/v1/resource',
        });
        expect(typeof body.timestamp).toBe('string');
        expect(warn).toHaveBeenCalledTimes(1);
    });

    it('preserves the validation message array from a BadRequestException', () => {
        const validationMessages = ['name must be a string', 'age must be an integer'];

        filter.catch(
            new BadRequestException(validationMessages),
            createHost({}),
        );

        const [, body, status] = reply.mock.calls[0] as [
            unknown,
            Record<string, unknown>,
            number,
        ];

        expect(status).toBe(400);
        expect(body).toMatchObject({
            statusCode: 400,
            message: validationMessages,
            error: 'Bad Request',
        });
        expect(Array.isArray(body.message)).toBe(true);
    });

    it('returns a generic 500 for unexpected errors without leaking details', () => {
        const error = jest.spyOn(Logger.prototype, 'error');

        filter.catch(
            new Error('secret db connection string leaked'),
            createHost({}),
        );

        const [, body, status] = reply.mock.calls[0] as [
            unknown,
            Record<string, unknown>,
            number,
        ];

        expect(status).toBe(500);
        expect(body).toMatchObject({
            statusCode: 500,
            message: 'Internal server error',
            error: 'Internal Server Error',
        });
        expect(JSON.stringify(body)).not.toContain('secret db connection string');
        expect(error).toHaveBeenCalledTimes(1);
        // Stack trace is passed as the second argument (server-side only).
        expect(error.mock.calls[0][1]).toContain('Error: secret db connection string leaked');
    });
});
