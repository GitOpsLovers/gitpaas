import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Inject,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
// eslint-disable-next-line @typescript-eslint/no-redeclare
import type { Request, Response } from 'express';

import { resolveRequestIdUseCase } from '../../application/resolve-request-id.use-case';
import { DomainError } from '../../domain/errors/domain.error';
import type { AppLogger } from '../../domain/ports/app-logger.port';
import { NestLoggerAdapter } from '../../infrastructure/logging/nest-logger.adapter';
import { REQUEST_ID_HEADER } from '../middlewares/request-id.middleware';

/**
 * Code published when a failure the client caused carries no domain code
 */
const GENERIC_CLIENT_ERROR_CODE = 'CLIENT_ERROR';

/**
 * Code published when a failure the server caused carries no domain code
 */
const GENERIC_SERVER_ERROR_CODE = 'SERVER_ERROR';

/**
 * Consistent JSON error envelope returned for every failed request.
 */
interface ErrorEnvelope {
    statusCode: number;
    code: string;
    message: string | string[];
    error: string;
    details?: object;
    timestamp: string;
    path: string;
    requestId: string;
}

/**
 * Global exception filter that shapes every error into a consistent JSON.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    constructor(
        private readonly httpAdapterHost: HttpAdapterHost,
        @Inject(NestLoggerAdapter) private readonly logger: AppLogger,
    ) {}

    /**
     * Catches any thrown value and shapes it into a consistent JSON envelope.
     *
     * @param exception Caught exception
     * @param host Arguments host, from which the request and response are extracted
     */
    public catch(exception: unknown, host: ArgumentsHost): void {
        const { httpAdapter } = this.httpAdapterHost;
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        const path = httpAdapter.getRequestUrl(request) as string;
        // eslint-disable-next-line security/detect-object-injection
        const requestId = resolveRequestIdUseCase(request.headers?.[REQUEST_ID_HEADER]);
        const envelope = this.buildEnvelope(exception, path, requestId);

        this.logException(exception, envelope);

        httpAdapter.reply(response, envelope, envelope.statusCode);
    }

    /**
     * Maps any thrown value to the consistent error envelope.
     *
     * @param exception Caught exception
     * @param path Request path
     * @param requestId Request ID
     *
     * @returns Error envelope to send to the client
     */
    private buildEnvelope(exception: unknown, path: string, requestId: string): ErrorEnvelope {
        const timestamp = new Date().toISOString();

        if (exception instanceof HttpException) {
            const statusCode = exception.getStatus();
            const body = exception.getResponse();
            const details = this.extractDetails(body);

            return {
                statusCode,
                code: this.extractCode(exception, statusCode),
                message: this.extractMessage(body, exception.message),
                error: this.extractError(body, statusCode),
                ...(details ? { details } : {}),
                timestamp,
                path,
                requestId,
            };
        }

        const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

        return {
            statusCode,
            code: GENERIC_SERVER_ERROR_CODE,
            message: 'Internal server error',
            error: this.statusName(statusCode),
            timestamp,
            path,
            requestId,
        };
    }

    /**
     * Resolves the machine-readable code published for an `HttpException`.
     *
     * @param exception Caught HTTP exception
     * @param statusCode Status code the exception carries
     *
     * @returns Domain error code, or the generic client/server code
     */
    private extractCode(exception: HttpException, statusCode: number): string {
        const { cause } = exception;

        if (cause instanceof DomainError) {
            return cause.code;
        }

        return statusCode >= HttpStatus.INTERNAL_SERVER_ERROR
            ? GENERIC_SERVER_ERROR_CODE
            : GENERIC_CLIENT_ERROR_CODE;
    }

    /**
     * Keeps the structured payload of an `HttpException` whose body is an object.
     *
     * @param body `HttpException` response body
     *
     * @returns The structured payload, or `undefined` when there is none to keep
     */
    private extractDetails(body: string | object): object | undefined {
        if (typeof body !== 'object' || Array.isArray(body)) {
            return undefined;
        }

        const message = (body as { message?: unknown }).message;

        if (typeof message === 'string' || Array.isArray(message)) {
            return undefined;
        }

        return body;
    }

    /**
     * Extracts the message(s) from an `HttpException` response body while preserving validation error arrays as-is.
     *
     * @param body `HttpException` response body
     * @param fallback Fallback message to use when the body has no message
     *
     * @returns The extracted message(s), or the fallback when there is none to extract
     */
    private extractMessage(body: string | object, fallback: string): string | string[] {
        if (typeof body === 'string') {
            return body;
        }

        const message = (body as { message?: unknown }).message;

        if (Array.isArray(message)) {
            return message as string[];
        }

        if (typeof message === 'string') {
            return message;
        }

        return fallback;
    }

    /**
     * Extracts the `error` label from an `HttpException` response body.
     *
     * @param body `HttpException` response body
     * @param statusCode Status code the exception carries
     *
     * @returns The extracted `error` label, or a human-readable status name when there is none to extract
     */
    private extractError(body: string | object, statusCode: number): string {
        if (typeof body === 'object') {
            const error = (body as { error?: unknown }).error;

            if (typeof error === 'string') {
                return error;
            }
        }

        return this.statusName(statusCode);
    }

    /**
     * Human-readable HTTP status name (e.g. 404 → "Not Found").
     *
     * @param statusCode HTTP status code
     *
     * @returns Human-readable status name, or "Error" when the code is unknown
     */
    private statusName(statusCode: number): string {
        // eslint-disable-next-line security/detect-object-injection
        const name = HttpStatus[statusCode] as string | undefined;

        if (!name) {
            return 'Error';
        }

        return name
            .toLowerCase()
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Builds the stack written to the log, following the `cause` chain.
     *
     * @param exception Caught exception
     *
     * @returns Stack of the exception followed by the stack of every chained cause
     */
    private resolveStack(exception: unknown): string | undefined {
        if (!(exception instanceof Error)) {
            return undefined;
        }

        const stacks: string[] = [exception.stack ?? `${exception.name}: ${exception.message}`];
        const seen = new Set<unknown>([exception]);
        let current: unknown = exception.cause;

        while (current instanceof Error && !seen.has(current)) {
            seen.add(current);
            stacks.push(`Caused by: ${current.stack ?? `${current.name}: ${current.message}`}`);
            current = current.cause;
        }

        return stacks.join('\n');
    }

    /**
     * Logs 5xx errors at `error` level with the stack trace
     * and ordinary 4xx client errors at `warn` without any stack trace.
     *
     * @param exception Caught exception
     * @param envelope Error envelope to log
     */
    private logException(exception: unknown, envelope: ErrorEnvelope): void {
        const context = `${envelope.statusCode} ${envelope.path}`;
        const prefix = `[${envelope.requestId}]`;

        if (envelope.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.error(
                `${prefix} Unhandled exception on ${context}`,
                this.resolveStack(exception),
                AllExceptionsFilter.name,
            );

            return;
        }

        const detail = Array.isArray(envelope.message)
            ? envelope.message.join(', ')
            : envelope.message;

        this.logger.warn(`${prefix} ${context} - ${detail}`, AllExceptionsFilter.name);
    }
}
