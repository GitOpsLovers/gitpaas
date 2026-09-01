import { UserNotFoundError } from '../users.errors';

import { DomainError } from '@core/domain/errors/domain.error';

const USER_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

describe('UserNotFoundError', () => {
    it('is a DomainError', () => {
        expect(new UserNotFoundError(USER_ID)).toBeInstanceOf(DomainError);
    });

    it('sets its name to UserNotFoundError', () => {
        expect(new UserNotFoundError(USER_ID).name).toBe('UserNotFoundError');
    });

    it('carries the USER_NOT_FOUND code', () => {
        expect(new UserNotFoundError(USER_ID).code).toBe('USER_NOT_FOUND');
    });

    it('names the identifier in its message', () => {
        expect(new UserNotFoundError(USER_ID).message).toBe(`User "${USER_ID}" not found`);
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('database is down');

        expect(new UserNotFoundError(USER_ID, { cause: original }).cause).toBe(original);
    });
});
