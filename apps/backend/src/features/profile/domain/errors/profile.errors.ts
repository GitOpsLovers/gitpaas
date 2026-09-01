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
