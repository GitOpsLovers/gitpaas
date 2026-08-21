import { DaemonUnreachableError, InvalidLogRetentionError } from '../server.errors';

import { DomainError } from '@core/domain/errors/domain.error';

describe('DaemonUnreachableError', () => {
    it('is a DomainError', () => {
        expect(new DaemonUnreachableError()).toBeInstanceOf(DomainError);
    });

    it('sets its name to DaemonUnreachableError', () => {
        expect(new DaemonUnreachableError().name).toBe('DaemonUnreachableError');
    });

    it('carries the DAEMON_UNREACHABLE code', () => {
        expect(new DaemonUnreachableError().code).toBe('DAEMON_UNREACHABLE');
    });

    it('names the daemon it could not reach in its message', () => {
        expect(new DaemonUnreachableError().message).toBe('Could not reach the server Docker daemon');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('ECONNREFUSED');

        expect(new DaemonUnreachableError({ cause: original }).cause).toBe(original);
    });
});

describe('InvalidLogRetentionError', () => {
    it('is a DomainError', () => {
        expect(new InvalidLogRetentionError()).toBeInstanceOf(DomainError);
    });

    it('sets its name to InvalidLogRetentionError', () => {
        expect(new InvalidLogRetentionError().name).toBe('InvalidLogRetentionError');
    });

    it('carries the INVALID_LOG_RETENTION code', () => {
        expect(new InvalidLogRetentionError().code).toBe('INVALID_LOG_RETENTION');
    });

    it('states the limits of the age of a log in its message', () => {
        expect(new InvalidLogRetentionError().message)
            .toBe('The age of a log must be a whole number of days between 1 and 365');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('out of range');

        expect(new InvalidLogRetentionError({ cause: original }).cause).toBe(original);
    });
});
