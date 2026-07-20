import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
// eslint-disable-next-line @typescript-eslint/no-redeclare
import type { Request, Response } from 'express';

/**
 * Consistent JSON error envelope returned for every failed request.
 */
interface ErrorEnvelope {
    statusCode: number;
    message: string | string[];
    error: string;
    timestamp: string;
    path: string;
}

/**
 * Global exception filter that shapes every error into a consistent JSON
 * envelope and centralises logging.
 *
 * - `HttpException` subclasses keep their original status code and message(s),
 *   including the `message` array produced by `ValidationPipe`.
 * - Any other (unexpected) error becomes an HTTP 500 with a generic message so
 *   internal details/stack traces are never leaked to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

    public catch(exception: unknown, host: ArgumentsHost): void {
        const { httpAdapter } = this.httpAdapterHost;
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        const path = httpAdapter.getRequestUrl(request) as string;
        const envelope = this.buildEnvelope(exception, path);

        this.logException(exception, envelope);

        httpAdapter.reply(response, envelope, envelope.statusCode);
    }

    /**
     * Maps any thrown value to the consistent error envelope.
     */
    private buildEnvelope(exception: unknown, path: string): ErrorEnvelope {
        const timestamp = new Date().toISOString();

        if (exception instanceof HttpException) {
            const statusCode = exception.getStatus();
            const body = exception.getResponse();

            return {
                statusCode,
                message: this.extractMessage(body, exception.message),
                error: this.extractError(body, statusCode),
                timestamp,
                path,
            };
        }

        const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

        return {
            statusCode,
            message: 'Internal server error',
            error: this.statusName(statusCode),
            timestamp,
            path,
        };
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
     * Logs 5xx errors at `error` level with the stack trace (server-side only)
     * and ordinary 4xx client errors at `warn` without any stack trace.
     */
    private logException(exception: unknown, envelope: ErrorEnvelope): void {
        const context = `${envelope.statusCode} ${envelope.path}`;

        if (envelope.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
            const stack = exception instanceof Error ? exception.stack : undefined;

            this.logger.error(`Unhandled exception on ${context}`, stack);

            return;
        }

        const detail = Array.isArray(envelope.message)
            ? envelope.message.join(', ')
            : envelope.message;

        this.logger.warn(`${context} - ${detail}`);
    }
}
