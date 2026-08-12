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

import { DomainError } from '../../domain/errors/domain.error';
import type { AppLogger } from '../../domain/ports/app-logger.port';
import { NestLoggerAdapter } from '../../infrastructure/logging/nest-logger.adapter';
import { REQUEST_ID_HEADER, resolveRequestId } from '../middlewares/request-id.middleware';

/**
 * Code published when a failure the client caused carries no domain code (a
 * validation rejection or a guard, for instance).
 */
export const GENERIC_CLIENT_ERROR_CODE = 'CLIENT_ERROR';

/**
 * Code published when a failure the server caused carries no domain code — the
 * unexpected errors reduced to a generic 500 included.
 */
export const GENERIC_SERVER_ERROR_CODE = 'SERVER_ERROR';

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
 * Global exception filter that shapes every error into a consistent JSON
 * envelope and centralises logging.
 *
 * - `HttpException` subclasses keep their original status code and message(s),
 *   including the `message` array produced by `ValidationPipe`.
 * - A structured `HttpException` body (an object carrying no `message`, such as
 *   the readiness breakdown) is preserved under `details` instead of being lost.
 * - Any other (unexpected) error becomes an HTTP 500 with a generic message so
 *   internal details/stack traces are never leaked to the client.
 * - Every envelope carries a `code`: the stable identifier of the domain error
 *   chained as the exception's `cause`, or a generic client/server code, so a
 *   client branches on `code` alone instead of matching prose.
 * - Every envelope carries the request's correlation id, which is also written to
 *   the log line, so a user-reported failure can be traced back to the server.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    constructor(
        private readonly httpAdapterHost: HttpAdapterHost,
        @Inject(NestLoggerAdapter) private readonly logger: AppLogger,
    ) {}

    public catch(exception: unknown, host: ArgumentsHost): void {
        const { httpAdapter } = this.httpAdapterHost;
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        const path = httpAdapter.getRequestUrl(request) as string;
        const requestId = resolveRequestId(request.headers?.[REQUEST_ID_HEADER]);
        const envelope = this.buildEnvelope(exception, path, requestId);

        this.logException(exception, envelope);

        httpAdapter.reply(response, envelope, envelope.statusCode);
    }

    /**
     * Maps any thrown value to the consistent error envelope.
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
     * The HTTP translator chains the domain error it translated through
     * `{ cause }`, so the stable `code` decided by the feature survives all the
     * way to the wire. An exception with no domain cause — a validation
     * rejection, a guard, a framework error — falls back to a generic code
     * chosen from the status class, so the field is always present and a client
     * can branch on it alone.
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
     * Keeps the structured payload of an `HttpException` whose body is an object
     * carrying no usable `message` — the readiness breakdown thrown by the server
     * controller, for instance — which would otherwise be reduced to the
     * exception's generic message and lost.
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
     * Extracts the message(s) from an `HttpException` response body while
     * preserving validation error arrays as-is.
     */
    private extractMessage(
        body: string | object,
        fallback: string,
    ): string | string[] {
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
     * Extracts the `error` label from an `HttpException` response body, falling
     * back to the canonical HTTP status name.
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
     * This filter writes the only log line a failed request produces, so it must
     * carry the failure the caller actually hit: a translated exception (a Docker
     * outage answered with a 503, for instance) says nothing on its own, while
     * the error chained through `{ cause }` does.
     *
     * @param exception Caught exception
     *
     * @returns Stack of the exception followed by the stack of every chained
     * cause, or `undefined` when the thrown value is not an error
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
     * Logs 5xx errors at `error` level with the stack trace (server-side only)
     * and ordinary 4xx client errors at `warn` without any stack trace.
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
