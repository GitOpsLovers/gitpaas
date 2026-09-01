/* eslint-disable no-secrets/no-secrets */
import {
    InvalidCredentialsError,
    InvalidRefreshTokenError,
    InvalidTotpCodeError,
    InvalidTwoFactorChallengeError,
    UserInactiveError,
} from '../authentication.errors';

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

describe('InvalidTwoFactorChallengeError', () => {
    it('is a DomainError', () => {
        expect(new InvalidTwoFactorChallengeError()).toBeInstanceOf(DomainError);
    });

    it('sets its name to InvalidTwoFactorChallengeError', () => {
        expect(new InvalidTwoFactorChallengeError().name).toBe('InvalidTwoFactorChallengeError');
    });

    it('carries the INVALID_TWO_FACTOR_CHALLENGE code', () => {
        expect(new InvalidTwoFactorChallengeError().code).toBe('INVALID_TWO_FACTOR_CHALLENGE');
    });

    it('keeps a message that does not disclose why the challenge was rejected', () => {
        expect(new InvalidTwoFactorChallengeError().message).toBe('Invalid two-factor challenge');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('jwt expired');

        expect(new InvalidTwoFactorChallengeError({ cause: original }).cause).toBe(original);
    });
});

describe('InvalidTotpCodeError', () => {
    it('is a DomainError', () => {
        expect(new InvalidTotpCodeError()).toBeInstanceOf(DomainError);
    });

    it('sets its name to InvalidTotpCodeError', () => {
        expect(new InvalidTotpCodeError().name).toBe('InvalidTotpCodeError');
    });

    it('carries the INVALID_TOTP_CODE code', () => {
        expect(new InvalidTotpCodeError().code).toBe('INVALID_TOTP_CODE');
    });

    it('keeps a message that does not disclose the expected code', () => {
        expect(new InvalidTotpCodeError().message).toBe('Invalid two-factor code');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('clock drift');

        expect(new InvalidTotpCodeError({ cause: original }).cause).toBe(original);
    });
});
