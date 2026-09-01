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

/**
 * Raised when the challenge of the second factor is unknown, expired, tampered with, or no longer names an account that holds a second factor.
 */
export class InvalidTwoFactorChallengeError extends DomainError {
    constructor(options?: ErrorOptions) {
        super('INVALID_TWO_FACTOR_CHALLENGE', 'Invalid two-factor challenge', options);
    }
}

/**
 * Raised when a code of the second factor does not match the secret of the account.
 */
export class InvalidTotpCodeError extends DomainError {
    constructor(options?: ErrorOptions) {
        super('INVALID_TOTP_CODE', 'Invalid two-factor code', options);
    }
}
