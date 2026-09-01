import { DomainError } from '@core/domain/errors/domain.error';

/**
 * Raised when the account behind a valid token no longer exists.
 */
export class ProfileNotFoundError extends DomainError {
    constructor(options?: ErrorOptions) {
        super('PROFILE_NOT_FOUND', 'Profile not found', options);
    }
}

/**
 * Raised when a change of the email address names an address another user already holds.
 */
export class EmailTakenError extends DomainError {
    constructor(email: string, options?: ErrorOptions) {
        super('EMAIL_TAKEN', `Email "${email}" is already taken`, options);
    }
}

/**
 * Raised when a change of the password carries a current password that does not match.
 */
export class InvalidCurrentPasswordError extends DomainError {
    constructor(options?: ErrorOptions) {
        super('INVALID_CURRENT_PASSWORD', 'Current password is incorrect', options);
    }
}

/**
 * Raised when a confirmation of the second factor arrives before any setup drew a secret.
 */
export class TotpNotStartedError extends DomainError {
    constructor(options?: ErrorOptions) {
        super('TOTP_NOT_STARTED', 'No two-factor setup is in progress', options);
    }
}

/**
 * Raised when a setup or a confirmation of the second factor reaches an account that already holds one.
 */
export class TotpAlreadyEnabledError extends DomainError {
    constructor(options?: ErrorOptions) {
        super('TOTP_ALREADY_ENABLED', 'The second factor is already enabled', options);
    }
}
