import { InvalidCredentialsError, InvalidRefreshTokenError, UserInactiveError } from '../authentication.errors';

import { DomainError } from '@core/domain/errors/domain.error';

describe('InvalidCredentialsError', () => {
    it('is a DomainError', () => {
        expect(new InvalidCredentialsError()).toBeInstanceOf(DomainError);
    });

    it('sets its name to InvalidCredentialsError', () => {
        expect(new InvalidCredentialsError().name).toBe('InvalidCredentialsError');
    });

    it('carries the INVALID_CREDENTIALS code', () => {
        expect(new InvalidCredentialsError().code).toBe('INVALID_CREDENTIALS');
    });

    it('keeps a generic message that never reveals whether the email exists', () => {
        expect(new InvalidCredentialsError().message).toBe('Invalid credentials');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('hash comparison failed');

        expect(new InvalidCredentialsError({ cause: original }).cause).toBe(original);
    });
});

describe('UserInactiveError', () => {
    it('is a DomainError', () => {
        expect(new UserInactiveError()).toBeInstanceOf(DomainError);
    });

    it('sets its name to UserInactiveError', () => {
        expect(new UserInactiveError().name).toBe('UserInactiveError');
    });

    it('carries the USER_INACTIVE code', () => {
        expect(new UserInactiveError().code).toBe('USER_INACTIVE');
    });

    it('states that the account is inactive', () => {
        expect(new UserInactiveError().message).toBe('User account is inactive');
    });
});

describe('InvalidRefreshTokenError', () => {
    it('is a DomainError', () => {
        expect(new InvalidRefreshTokenError()).toBeInstanceOf(DomainError);
    });

    it('sets its name to InvalidRefreshTokenError', () => {
        expect(new InvalidRefreshTokenError().name).toBe('InvalidRefreshTokenError');
    });

    it('carries the INVALID_REFRESH_TOKEN code', () => {
        expect(new InvalidRefreshTokenError().code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('keeps a message that does not disclose why the token was rejected', () => {
        expect(new InvalidRefreshTokenError().message).toBe('Invalid refresh token');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('jwt expired');

        expect(new InvalidRefreshTokenError({ cause: original }).cause).toBe(original);
    });
});
