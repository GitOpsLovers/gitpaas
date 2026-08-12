import { DomainError } from '@core/domain/errors/domain.error';

/**
 * Raised when a login attempt fails because the email is unknown or the
 * password does not match. The message is deliberately generic so it never
 * reveals whether the email exists.
 */
export class InvalidCredentialsError extends DomainError {
    /**
     * @param options Standard error options, so `{ cause }` chains the original error
     */
    constructor(options?: ErrorOptions) {
        super('INVALID_CREDENTIALS', 'Invalid credentials', options);
    }
}

/**
 * Raised when authentication succeeds against a user whose account has been
 * deactivated.
 */
export class UserInactiveError extends DomainError {
    /**
     * @param options Standard error options, so `{ cause }` chains the original error
     */
    constructor(options?: ErrorOptions) {
        super('USER_INACTIVE', 'User account is inactive', options);
    }
}

/**
 * Raised when a refresh token is unknown, revoked, expired or tampered with.
 */
export class InvalidRefreshTokenError extends DomainError {
    /**
     * @param options Standard error options, so `{ cause }` chains the original error
     */
    constructor(options?: ErrorOptions) {
        super('INVALID_REFRESH_TOKEN', 'Invalid refresh token', options);
    }
}
