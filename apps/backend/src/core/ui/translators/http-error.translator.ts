import {
    BadRequestException,
    ConflictException,
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
 * Builds the HTTP exception an unexpected non-domain failure must become.
 */
type UnexpectedErrorTranslation = (error: unknown) => HttpException;

/**
 * The single mapping from a domain error `code` to the HTTP exception the client receives.
 */
const DOMAIN_ERROR_TRANSLATIONS = new Map<string, DomainErrorTranslation>([
    ['NAMESPACE_NOT_FOUND', (error) => new NotFoundException(error.message, { cause: error })],
    ['NAMESPACE_NOT_EMPTY', (error) => new ConflictException(error.message, { cause: error })],
    ['PROJECT_NOT_FOUND', (error) => new NotFoundException(error.message, { cause: error })],
    ['PROJECT_NAME_TAKEN', (error) => new ConflictException(error.message, { cause: error })],
    ['PROVIDER_NOT_FOUND', (error) => new NotFoundException(error.message, { cause: error })],
    ['PROVIDER_NAME_TAKEN', (error) => new ConflictException(error.message, { cause: error })],
    ['PROVIDER_IN_USE', (error) => new ConflictException(error.message, { cause: error })],
    ['PROVIDER_REGISTRATION_NOT_FOUND', (error) => new NotFoundException(error.message, { cause: error })],
    ['PROVIDER_REGISTRATION_EXPIRED', (error) => new NotFoundException(error.message, { cause: error })],
    ['PROVIDER_REGISTRATION_STEP_CONFLICT', (error) => new ConflictException(error.message, { cause: error })],
    ['SERVICE_NOT_FOUND', (error) => new NotFoundException(error.message, { cause: error })],
    ['SERVICE_NOT_DEPLOYABLE', (error) => new BadRequestException(error.message, { cause: error })],
    ['PROVIDER_REPOSITORY_UNREACHABLE', (error) => new BadRequestException(error.message, { cause: error })],
    ['INVALID_CREDENTIALS', (error) => new UnauthorizedException(error.message, { cause: error })],
    ['USER_INACTIVE', (error) => new UnauthorizedException(error.message, { cause: error })],
    ['INVALID_REFRESH_TOKEN', (error) => new UnauthorizedException(error.message, { cause: error })],
    ['PROVIDER_RESOURCE_NOT_FOUND', (error) => new NotFoundException(error.message, { cause: error })],
    ['PROVIDER_NOT_CONFIGURED', (error) => new ServiceUnavailableException(error.message, { cause: error })],
    ['PROVIDER_AUTHENTICATION_FAILED', (error) => new ServiceUnavailableException(error.message, { cause: error })],
    ['PROVIDER_RATE_LIMITED', (error) => new ServiceUnavailableException(error.message, { cause: error })],
    ['PROVIDER_MANIFEST_CODE_REJECTED', (error) => new BadRequestException(error.message, { cause: error })],
    ['PROVIDER_UNAVAILABLE', (error) => new ServiceUnavailableException(error.message, { cause: error })],
    ['DAEMON_UNREACHABLE', (error) => new ServiceUnavailableException(error.message, { cause: error })],
    ['INVALID_LOG_RETENTION', (error) => new BadRequestException(error.message, { cause: error })],
    ['INVALID_GITPAAS_DOMAIN', (error) => new BadRequestException(error.message, { cause: error })],
    ['GITPAAS_DOMAIN_NOT_POINTING_AT_HOST', (error) => new BadRequestException(error.message, { cause: error }) ],
    ['HOST_ADDRESS_UNKNOWN', (error) => new ServiceUnavailableException(error.message, { cause: error })],
    ['CONTROL_PLANE_ENV_WRITE_FAILED', (error) => new ServiceUnavailableException(error.message, { cause: error }) ],
    ['UPDATE_ALREADY_RUNNING', (error) => new ConflictException(error.message, { cause: error })],
    ['PLATFORM_UP_TO_DATE', (error) => new ConflictException(error.message, { cause: error })],
    ['UNKNOWN_PLATFORM_VERSION', (error) => new ConflictException(error.message, { cause: error })],
    ['RELEASE_SOURCE_UNAVAILABLE', (error) => new ServiceUnavailableException(error.message, { cause: error })],
    ['VARIABLE_NOT_FOUND', (error) => new NotFoundException(error.message, { cause: error })],
    ['VARIABLE_NAME_TAKEN', (error) => new ConflictException(error.message, { cause: error })],
    ['DOMAIN_NOT_FOUND', (error) => new NotFoundException(error.message, { cause: error })],
    ['DOMAIN_TAKEN', (error) => new ConflictException(error.message, { cause: error })],
    ['PROJECT_NETWORK_NOT_FOUND', (error) => new NotFoundException(error.message, { cause: error })],
    ['PROJECT_NETWORK_NAME_TAKEN', (error) => new ConflictException(error.message, { cause: error })],
    ['PROJECT_NETWORK_IN_USE', (error) => new ConflictException(error.message, { cause: error })],
]);

/**
 * Translates a caught error into the value the UI edge must throw.
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
