/**
 * Raised when a login attempt fails because the email is unknown or the
 * password does not match. The message is deliberately generic so it never
 * reveals whether the email exists.
 */
export class InvalidCredentialsError extends Error {
    constructor() {
        super('Invalid credentials');
        this.name = 'InvalidCredentialsError';
    }
}

/**
 * Raised when authentication succeeds against a user whose account has been
 * deactivated.
 */
export class UserInactiveError extends Error {
    constructor() {
        super('User account is inactive');
        this.name = 'UserInactiveError';
    }
}

/**
 * Raised when a refresh token is unknown, revoked, expired or tampered with.
 */
export class InvalidRefreshTokenError extends Error {
    constructor() {
        super('Invalid refresh token');
        this.name = 'InvalidRefreshTokenError';
    }
}
