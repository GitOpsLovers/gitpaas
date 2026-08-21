import { DaemonUnreachableError } from '../server.errors';

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
