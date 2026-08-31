import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpException,
    NotFoundException,
    ServiceUnavailableException,
    UnauthorizedException,
} from '@nestjs/common';

import { DomainError } from '../../../domain/errors/domain.error';
import { translateError } from '../http-error.translator';

/**
 * Stand-in for a feature domain error. The specs stay inside `core`, so they
 * pin the `code` → exception mapping; each feature's own error spec pins the
 * class → `code` half.
 */
class CodedDomainError extends DomainError {
    constructor(code: string, message = 'Domain failure') {
        super(code, message);
    }
}

const serviceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

describe('translateError', () => {
    describe('already-HTTP errors', () => {
        it('returns an HttpException untouched', () => {
            const original = new ServiceUnavailableException('daemon down');

            expect(translateError(original)).toBe(original);
        });

        it('returns any HttpException subclass untouched, not only ServiceUnavailableException', () => {
            const original = new ForbiddenException('nope');

            expect(translateError(original)).toBe(original);
        });

        it('never hands an HttpException to the unexpected-error policy', () => {
            const original = new NotFoundException('missing');
            const unexpected = jest.fn(() => new ServiceUnavailableException('daemon down'));

            expect(translateError(original, unexpected)).toBe(original);
            expect(unexpected).not.toHaveBeenCalled();
        });
    });

    describe('mapped domain errors', () => {
        it('maps SERVICE_NOT_FOUND to a NotFoundException', () => {
            const error = new CodedDomainError('SERVICE_NOT_FOUND', `Service ${serviceId} not found`);

            expect(translateError(error)).toBeInstanceOf(NotFoundException);
        });

        it('keeps the domain message on the translated exception', () => {
            const error = new CodedDomainError('SERVICE_NOT_FOUND', `Service ${serviceId} not found`);

            const result = translateError(error) as HttpException;

            expect(result.message).toBe(`Service ${serviceId} not found`);
        });

        it('chains the domain error as the cause of the translated exception', () => {
            const error = new CodedDomainError('SERVICE_NOT_FOUND');

            const result = translateError(error) as HttpException;

            expect(result.cause).toBe(error);
        });

        it('maps PROJECT_NOT_FOUND to a NotFoundException', () => {
            expect(translateError(new CodedDomainError('PROJECT_NOT_FOUND'))).toBeInstanceOf(NotFoundException);
        });

        it('maps PROJECT_NAME_TAKEN to a ConflictException', () => {
            expect(translateError(new CodedDomainError('PROJECT_NAME_TAKEN'))).toBeInstanceOf(ConflictException);
        });

        it('keeps the domain message of a PROJECT_NAME_TAKEN conflict', () => {
            const error = new CodedDomainError('PROJECT_NAME_TAKEN', 'Project platform already exists in namespace n-1');

            const result = translateError(error) as HttpException;

            expect(result.message).toBe('Project platform already exists in namespace n-1');
        });

        it('maps NAMESPACE_NOT_FOUND to a NotFoundException', () => {
            expect(translateError(new CodedDomainError('NAMESPACE_NOT_FOUND'))).toBeInstanceOf(NotFoundException);
        });

        it('maps NAMESPACE_NOT_EMPTY to a ConflictException', () => {
            expect(translateError(new CodedDomainError('NAMESPACE_NOT_EMPTY'))).toBeInstanceOf(ConflictException);
        });

        it('keeps the domain message of a NAMESPACE_NOT_EMPTY conflict', () => {
            const error = new CodedDomainError('NAMESPACE_NOT_EMPTY', 'Namespace n-1 still has 2 project(s) attached');

            const result = translateError(error) as HttpException;

            expect(result.message).toBe('Namespace n-1 still has 2 project(s) attached');
        });

        it('maps SERVICE_NOT_DEPLOYABLE to a BadRequestException', () => {
            expect(translateError(new CodedDomainError('SERVICE_NOT_DEPLOYABLE'))).toBeInstanceOf(BadRequestException);
        });

        it('maps INVALID_CREDENTIALS to an UnauthorizedException', () => {
            expect(translateError(new CodedDomainError('INVALID_CREDENTIALS'))).toBeInstanceOf(UnauthorizedException);
        });

        it('maps USER_INACTIVE to an UnauthorizedException', () => {
            expect(translateError(new CodedDomainError('USER_INACTIVE'))).toBeInstanceOf(UnauthorizedException);
        });

        it('maps INVALID_REFRESH_TOKEN to an UnauthorizedException', () => {
            expect(translateError(new CodedDomainError('INVALID_REFRESH_TOKEN')))
                .toBeInstanceOf(UnauthorizedException);
        });

        it('maps PROVIDER_RESOURCE_NOT_FOUND to a NotFoundException', () => {
            expect(translateError(new CodedDomainError('PROVIDER_RESOURCE_NOT_FOUND')))
                .toBeInstanceOf(NotFoundException);
        });

        it('maps PROVIDER_NOT_CONFIGURED to a ServiceUnavailableException', () => {
            expect(translateError(new CodedDomainError('PROVIDER_NOT_CONFIGURED')))
                .toBeInstanceOf(ServiceUnavailableException);
        });

        it('maps PROVIDER_AUTHENTICATION_FAILED to a ServiceUnavailableException', () => {
            expect(translateError(new CodedDomainError('PROVIDER_AUTHENTICATION_FAILED')))
                .toBeInstanceOf(ServiceUnavailableException);
        });

        it('maps PROVIDER_RATE_LIMITED to a ServiceUnavailableException', () => {
            expect(translateError(new CodedDomainError('PROVIDER_RATE_LIMITED')))
                .toBeInstanceOf(ServiceUnavailableException);
        });

        it('maps DAEMON_UNREACHABLE to a ServiceUnavailableException', () => {
            expect(translateError(new CodedDomainError('DAEMON_UNREACHABLE')))
                .toBeInstanceOf(ServiceUnavailableException);
        });

        it('maps INVALID_LOG_RETENTION to a BadRequestException', () => {
            expect(translateError(new CodedDomainError('INVALID_LOG_RETENTION')))
                .toBeInstanceOf(BadRequestException);
        });

        it('maps INVALID_GITPAAS_DOMAIN to a BadRequestException', () => {
            expect(translateError(new CodedDomainError('INVALID_GITPAAS_DOMAIN')))
                .toBeInstanceOf(BadRequestException);
        });

        it('maps GITPAAS_DOMAIN_NOT_POINTING_AT_HOST to a BadRequestException', () => {
            expect(translateError(new CodedDomainError('GITPAAS_DOMAIN_NOT_POINTING_AT_HOST')))
                .toBeInstanceOf(BadRequestException);
        });

        it('maps HOST_ADDRESS_UNKNOWN to a ServiceUnavailableException', () => {
            expect(translateError(new CodedDomainError('HOST_ADDRESS_UNKNOWN')))
                .toBeInstanceOf(ServiceUnavailableException);
        });

        it('maps CONTROL_PLANE_ENV_WRITE_FAILED to a ServiceUnavailableException', () => {
            expect(translateError(new CodedDomainError('CONTROL_PLANE_ENV_WRITE_FAILED')))
                .toBeInstanceOf(ServiceUnavailableException);
        });

        it('maps UPDATE_ALREADY_RUNNING to a ConflictException', () => {
            expect(translateError(new CodedDomainError('UPDATE_ALREADY_RUNNING')))
                .toBeInstanceOf(ConflictException);
        });

        it('maps PLATFORM_UP_TO_DATE to a ConflictException', () => {
            expect(translateError(new CodedDomainError('PLATFORM_UP_TO_DATE')))
                .toBeInstanceOf(ConflictException);
        });

        it('maps UNKNOWN_PLATFORM_VERSION to a ConflictException', () => {
            expect(translateError(new CodedDomainError('UNKNOWN_PLATFORM_VERSION')))
                .toBeInstanceOf(ConflictException);
        });

        it('maps PROVIDER_MANIFEST_CODE_REJECTED to a BadRequestException', () => {
            expect(translateError(new CodedDomainError('PROVIDER_MANIFEST_CODE_REJECTED')))
                .toBeInstanceOf(BadRequestException);
        });

        it('maps PROVIDER_REGISTRATION_NOT_FOUND to a NotFoundException', () => {
            expect(translateError(new CodedDomainError('PROVIDER_REGISTRATION_NOT_FOUND')))
                .toBeInstanceOf(NotFoundException);
        });

        it('maps PROVIDER_REGISTRATION_EXPIRED to a NotFoundException', () => {
            expect(translateError(new CodedDomainError('PROVIDER_REGISTRATION_EXPIRED')))
                .toBeInstanceOf(NotFoundException);
        });

        it('maps PROVIDER_REGISTRATION_STEP_CONFLICT to a ConflictException', () => {
            expect(translateError(new CodedDomainError('PROVIDER_REGISTRATION_STEP_CONFLICT')))
                .toBeInstanceOf(ConflictException);
        });

        it('maps PROVIDER_UNAVAILABLE to a ServiceUnavailableException', () => {
            expect(translateError(new CodedDomainError('PROVIDER_UNAVAILABLE')))
                .toBeInstanceOf(ServiceUnavailableException);
        });

        it('ignores the unexpected-error policy for a mapped domain error', () => {
            const unexpected = jest.fn(() => new ServiceUnavailableException('daemon down'));

            expect(translateError(new CodedDomainError('SERVICE_NOT_DEPLOYABLE'), unexpected))
                .toBeInstanceOf(BadRequestException);
            expect(unexpected).not.toHaveBeenCalled();
        });
    });

    describe('unmapped domain errors', () => {
        it('returns the error untouched so the global filter answers 500', () => {
            const error = new CodedDomainError('NOT_IN_THE_TABLE');

            expect(translateError(error)).toBe(error);
        });

        it('is never silently converted by the unexpected-error policy', () => {
            const error = new CodedDomainError('NOT_IN_THE_TABLE');
            const unexpected = jest.fn(() => new ServiceUnavailableException('daemon down'));

            expect(translateError(error, unexpected)).toBe(error);
            expect(unexpected).not.toHaveBeenCalled();
        });
    });

    describe('unexpected errors', () => {
        it('applies the caller policy when one is given', () => {
            const boom = new Error('ECONNREFUSED');
            const translated = new ServiceUnavailableException('daemon down');

            expect(translateError(boom, () => translated)).toBe(translated);
        });

        it('passes the original error to the policy', () => {
            const boom = new Error('ECONNREFUSED');
            const unexpected = jest.fn(() => new ServiceUnavailableException('daemon down'));

            translateError(boom, unexpected);

            expect(unexpected).toHaveBeenCalledWith(boom);
        });

        it('applies the policy to non-Error thrown values too', () => {
            const translated = new ServiceUnavailableException('daemon down');

            expect(translateError('boom', () => translated)).toBe(translated);
        });

        it('returns the error untouched when no policy is given', () => {
            const boom = new Error('database is down');

            expect(translateError(boom)).toBe(boom);
        });
    });
});
