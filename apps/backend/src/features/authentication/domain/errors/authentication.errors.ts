import { DomainError } from '@core/domain/errors/domain.error';

/**
 * Raised when a login attempt fails because the email is unknown or the password does not match.
 */
export class InvalidCredentialsError extends DomainError {
    constructor(options?: ErrorOptions) {
        super('INVALID_CREDENTIALS', 'Invalid credentials', options);
    }
}

/**
 * Raised when authentication succeeds against a user whose account has been deactivated.
 */
export class UserInactiveError extends DomainError {
    constructor(options?: ErrorOptions) {
        super('USER_INACTIVE', 'User account is inactive', options);
    }
}

/**
 * Raised when a refresh token is unknown, revoked, expired or tampered with.
 */
export class InvalidRefreshTokenError extends DomainError {
    constructor(options?: ErrorOptions) {
        super('INVALID_REFRESH_TOKEN', 'Invalid refresh token', options);
    }
}

/**
 * Raised when a request carries no access token, or one that is expired, invalid or bound to a user the guard cannot accept.
 */
export class UnauthenticatedError extends DomainError {
    constructor(options?: ErrorOptions) {
        super('UNAUTHENTICATED', 'Authentication required', options);
    }
}
