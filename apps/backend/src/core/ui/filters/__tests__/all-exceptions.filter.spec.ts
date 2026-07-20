import {
    ArgumentsHost,
    BadRequestException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

import { AllExceptionsFilter } from '../all-exceptions.filter';

/**
 * Consistent error-envelope shape asserted at the `reply(...)` boundary.
 */
interface ErrorEnvelope {
    statusCode: number;
    message: string | string[];
    error: string;
    timestamp: string;
    path: string;
}

const REQUEST_PATH = '/api/v1/resource';

/**
 * Builds a fake `ArgumentsHost` from `jest.fn()` mocks whose HTTP context hands
 * back the fixture request/response — mirrors the decorator spec's fake
 * `ExecutionContext`.
 */
const hostFor = (
    request: unknown,
    response: unknown,
): ArgumentsHost => {
    const mockGetRequest = jest.fn().mockReturnValue(request);
    const mockGetResponse = jest.fn().mockReturnValue(response);
    const mockSwitchToHttp = jest
        .fn()
        .mockReturnValue({ getRequest: mockGetRequest, getResponse: mockGetResponse });

    return {
        switchToHttp: mockSwitchToHttp,
    } as unknown as ArgumentsHost;
};

describe('AllExceptionsFilter', () => {
    const request = { url: REQUEST_PATH };
    const response = {};

    let mockReply: jest.Mock;
    let mockGetRequestUrl: jest.Mock;
    let mockHttpAdapterHost: HttpAdapterHost;
    let mockWarn: jest.SpyInstance;
    let mockError: jest.SpyInstance;
    let sut: AllExceptionsFilter;

    beforeEach(() => {
        jest.clearAllMocks();

        mockReply = jest.fn();
        mockGetRequestUrl = jest.fn().mockReturnValue(REQUEST_PATH);

        const httpAdapter: jest.Mocked<Pick<
            HttpAdapterHost['httpAdapter'],
            'getRequestUrl' | 'reply'
        >> = {
            getRequestUrl: mockGetRequestUrl,
            reply: mockReply,
        };

        mockHttpAdapterHost = { httpAdapter } as unknown as HttpAdapterHost;

        mockWarn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
        mockError = jest.spyOn(Logger.prototype, 'error').mockImplementation();

        sut = new AllExceptionsFilter(mockHttpAdapterHost);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('formats an HttpException into an envelope preserving status code and message', () => {
        sut.catch(new NotFoundException('Item missing'), hostFor(request, response));

        expect(mockReply).toHaveBeenCalledTimes(1);
        const [replyResponse, envelope, statusCode] = mockReply.mock.calls[0] as [
            unknown,
            ErrorEnvelope,
            number,
        ];

        expect(replyResponse).toBe(response);
        expect(statusCode).toBe(404);
        expect(envelope).toEqual({
            statusCode: 404,
            message: 'Item missing',
            error: 'Not Found',
            path: REQUEST_PATH,
            timestamp: expect.any(String),
        });
        expect(mockWarn).toHaveBeenCalledTimes(1);
        expect(mockError).not.toHaveBeenCalled();
    });

    it('preserves the validation message array from a BadRequestException', () => {
        const validationMessages = ['name must be a string', 'age must be an integer'];

        sut.catch(new BadRequestException(validationMessages), hostFor(request, response));

        expect(mockReply).toHaveBeenCalledTimes(1);
        const [replyResponse, envelope, statusCode] = mockReply.mock.calls[0] as [
            unknown,
            ErrorEnvelope,
            number,
        ];

        expect(replyResponse).toBe(response);
        expect(statusCode).toBe(400);
        expect(envelope).toEqual({
            statusCode: 400,
            message: validationMessages,
            error: 'Bad Request',
            path: REQUEST_PATH,
            timestamp: expect.any(String),
        });
        expect(Array.isArray(envelope.message)).toBe(true);
        expect(mockWarn).toHaveBeenCalledTimes(1);
    });

    it('returns a generic 500 for an unexpected error without leaking internal details', () => {
        const error = new Error('secret db connection string leaked');

        sut.catch(error, hostFor(request, response));

        expect(mockReply).toHaveBeenCalledTimes(1);
        const [replyResponse, envelope, statusCode] = mockReply.mock.calls[0] as [
            unknown,
            ErrorEnvelope,
            number,
        ];

        expect(replyResponse).toBe(response);
        expect(statusCode).toBe(500);
        expect(envelope).toEqual({
            statusCode: 500,
            message: 'Internal server error',
            error: 'Internal Server Error',
            path: REQUEST_PATH,
            timestamp: expect.any(String),
        });
        expect(JSON.stringify(envelope)).not.toContain('secret db connection string');
    });

    it('logs an unexpected error at error level with the stack as the second argument', () => {
        const error = new Error('secret db connection string leaked');

        sut.catch(error, hostFor(request, response));

        expect(mockError).toHaveBeenCalledTimes(1);
        expect(mockWarn).not.toHaveBeenCalled();
        expect(mockError.mock.calls[0][1]).toBe(error.stack);
    });
});
