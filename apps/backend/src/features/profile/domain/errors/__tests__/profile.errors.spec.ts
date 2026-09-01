import { EmailTakenError, InvalidCurrentPasswordError, ProfileNotFoundError } from '../profile.errors';

import { DomainError } from '@core/domain/errors/domain.error';

describe('ProfileNotFoundError', () => {
    it('is a DomainError', () => {
        expect(new ProfileNotFoundError()).toBeInstanceOf(DomainError);
    });

    it('sets its name to ProfileNotFoundError', () => {
        expect(new ProfileNotFoundError().name).toBe('ProfileNotFoundError');
    });

    it('carries the PROFILE_NOT_FOUND code', () => {
        expect(new ProfileNotFoundError().code).toBe('PROFILE_NOT_FOUND');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('row is gone');

        expect(new ProfileNotFoundError({ cause: original }).cause).toBe(original);
    });
});

describe('EmailTakenError', () => {
    it('is a DomainError', () => {
        expect(new EmailTakenError('ada@example.com')).toBeInstanceOf(DomainError);
    });

    it('sets its name to EmailTakenError', () => {
        expect(new EmailTakenError('ada@example.com').name).toBe('EmailTakenError');
    });

    it('carries the EMAIL_TAKEN code', () => {
        expect(new EmailTakenError('ada@example.com').code).toBe('EMAIL_TAKEN');
    });

    it('builds a message carrying the address it received', () => {
        expect(new EmailTakenError('ada@example.com').message).toBe('Email "ada@example.com" is already taken');
    });
});

describe('InvalidCurrentPasswordError', () => {
    it('is a DomainError', () => {
        expect(new InvalidCurrentPasswordError()).toBeInstanceOf(DomainError);
    });

    it('sets its name to InvalidCurrentPasswordError', () => {
        expect(new InvalidCurrentPasswordError().name).toBe('InvalidCurrentPasswordError');
    });

    it('carries the INVALID_CURRENT_PASSWORD code', () => {
        expect(new InvalidCurrentPasswordError().code).toBe('INVALID_CURRENT_PASSWORD');
    });

    it('never names the password in its message', () => {
        expect(new InvalidCurrentPasswordError().message).toBe('Current password is incorrect');
    });
});
