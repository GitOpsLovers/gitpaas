import {
    BadRequestException,
    HttpException,
    NotFoundException,
    ServiceUnavailableException,
    UnauthorizedException,
} from '@nestjs/common';

import { DomainError } from '../../domain/errors/domain.error';

/**
 * Builds the HTTP exception a given domain error must become.
 */
type DomainErrorTranslation = (error: DomainError) => HttpException;

/**
 * Builds the HTTP exception an unexpected (non-domain) failure must become, for
 * the callers that own such a policy — the Docker-backed endpoints answer 503
 * with a remediation hint, for instance.
 */
export type UnexpectedErrorTranslation = (error: unknown) => HttpException;

/**
 * The single mapping from a domain error `code` to the HTTP exception the
 * client receives. Keys are the `code` values declared by the `DomainError`
 * subclasses; the table lives here (and not in `core/domain`) because a status
 * code is an HTTP concern.
 *
 * **To add a new mapping:** give the new `DomainError` subclass a unique `code`
 * in its feature's `domain/errors/<entity>.errors.ts`, then add one entry here
 * keyed by that same string. Nothing else has to change: every controller that
 * calls `translateError` picks the new mapping up automatically. A code that is
 * absent from this table is deliberate — the error falls through untouched and
 * the global exception filter answers 500.
 */
const DOMAIN_ERROR_TRANSLATIONS = new Map<string, DomainErrorTranslation>([
    ['PROJECT_NOT_FOUND', (error) => new NotFoundException(error.message, { cause: error })],
    ['SERVICE_NOT_FOUND', (error) => new NotFoundException(error.message, { cause: error })],
    ['SERVICE_NOT_DEPLOYABLE', (error) => new BadRequestException(error.message, { cause: error })],
    ['INVALID_CREDENTIALS', (error) => new UnauthorizedException(error.message, { cause: error })],
    ['USER_INACTIVE', (error) => new UnauthorizedException(error.message, { cause: error })],
    ['INVALID_REFRESH_TOKEN', (error) => new UnauthorizedException(error.message, { cause: error })],
    ['SOURCE_CONTROL_RESOURCE_NOT_FOUND', (error) => new NotFoundException(error.message, { cause: error })],
    ['SOURCE_CONTROL_NOT_CONFIGURED', (error) => new ServiceUnavailableException(error.message, { cause: error })],
    [
        'SOURCE_CONTROL_AUTHENTICATION_FAILED',
        (error) => new ServiceUnavailableException(error.message, { cause: error }),
    ],
    ['SOURCE_CONTROL_RATE_LIMITED', (error) => new ServiceUnavailableException(error.message, { cause: error })],
    ['SOURCE_CONTROL_UNAVAILABLE', (error) => new ServiceUnavailableException(error.message, { cause: error })],
]);

/**
 * Translates a caught error into the value the UI edge must throw. It is the
 * one and only translation point between the domain and HTTP, so a controller
 * catch block reduces to `throw translateError(error)`.
 *
 * The rules, in order:
 *
 * 1. An `HttpException` is returned untouched, so a status decided deeper (or
 *    by a guard) is never re-wrapped.
 * 2. A `DomainError` whose `code` is mapped becomes the mapped exception, with
 *    the original error chained through `{ cause }`.
 * 3. Any other error is handed to `unexpected`, when the caller provides one.
 * 4. Otherwise — including an unmapped `DomainError` — the error is returned as
 *    it came, so it falls through to the global filter as a 500 rather than
 *    being silently converted into a friendlier status.
 *
 * @param error The caught error
 * @param unexpected Optional policy for failures that are not domain errors
 *
 * @returns The value the caller must throw
 */
export function translateError(error: unknown, unexpected?: UnexpectedErrorTranslation): unknown {
    if (error instanceof HttpException) {
        return error;
    }

    if (error instanceof DomainError) {
        const translation = DOMAIN_ERROR_TRANSLATIONS.get(error.code);

        return translation ? translation(error) : error;
    }

    if (unexpected) {
        return unexpected(error);
    }

    return error;
}
