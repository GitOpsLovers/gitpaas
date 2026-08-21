import type { ErrorEnvelope } from '@gitpaas/contracts';
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
// eslint-disable-next-line @typescript-eslint/no-redeclare
import type { Request, Response } from 'express';

import { resolveRequestIdUseCase } from '../../application/resolve-request-id.use-case';
import { truncateStackUseCase } from '../../application/truncate-stack.use-case';
import { DomainError } from '../../domain/errors/domain.error';
import { enrichTelemetry } from '../../infrastructure/telemetry/telemetry.context';
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
 * Global exception filter that shapes every error into a consistent JSON.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

    public catch(exception: unknown, host: ArgumentsHost): void {
        const { httpAdapter } = this.httpAdapterHost;
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        const path = httpAdapter.getRequestUrl(request) as string;
        // eslint-disable-next-line security/detect-object-injection
        const requestId = resolveRequestIdUseCase(request.headers?.[REQUEST_ID_HEADER]);
        const envelope = this.buildEnvelope(exception, path, requestId);

        this.enrichWithError(exception, envelope);

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
    private extractDetails(body: string | object): Record<string, unknown> | undefined {
        if (typeof body !== 'object' || Array.isArray(body)) {
            return undefined;
        }

        const message = (body as { message?: unknown }).message;

        if (typeof message === 'string' || Array.isArray(message)) {
            return undefined;
        }

        return body as Record<string, unknown>;
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
     * Builds the stack recorded in the telemetry event, following the `cause` chain.
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

        return truncateStackUseCase(stacks.join('\n'));
    }

    /**
     * Names of the chained causes of the exception, following the `cause` chain.
     *
     * @param exception Caught exception
     *
     * @returns Name of every chained cause, or `undefined` when the exception has none
     */
    private resolveCauseChain(exception: unknown): string[] | undefined {
        if (!(exception instanceof Error)) {
            return undefined;
        }

        const names: string[] = [];
        const seen = new Set<unknown>([exception]);
        let current: unknown = exception.cause;

        while (current instanceof Error && !seen.has(current)) {
            seen.add(current);
            names.push(this.resolveType(current));
            current = current.cause;
        }

        return names.length > 0 ? names : undefined;
    }

    /**
     * Constructor name of the thrown value.
     *
     * @param exception Caught exception
     *
     * @returns Constructor name of the exception, or its primitive type when it is not an object
     */
    private resolveType(exception: unknown): string {
        if (exception instanceof Error) {
            return exception.constructor.name;
        }

        return typeof exception;
    }

    /**
     * Internal message of the thrown value, which is not the message sent to the client.
     *
     * @param exception Caught exception
     *
     * @returns Message of the exception
     */
    private resolveMessage(exception: unknown): string {
        if (exception instanceof Error) {
            return exception.message;
        }

        return String(exception);
    }

    /**
     * Adds the error fields of the failure to the telemetry event of the current request.
     *
     * @param exception Caught exception
     * @param envelope Error envelope sent to the client
     */
    private enrichWithError(exception: unknown, envelope: ErrorEnvelope): void {
        const isServerError = envelope.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR;
        const stack = isServerError ? this.resolveStack(exception) : undefined;
        const causeChain = this.resolveCauseChain(exception);

        enrichTelemetry({
            'error.type': this.resolveType(exception),
            'error.code': envelope.code,
            'error.message': this.resolveMessage(exception),
            ...(causeChain ? { 'error.cause_chain': causeChain } : {}),
            ...(stack ? { 'error.stack': stack } : {}),
        });
    }
}
