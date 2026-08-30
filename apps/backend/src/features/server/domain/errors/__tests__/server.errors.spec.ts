import { DOMAIN_HOST_MESSAGE } from '@gitpaas/contracts';

import {
    DaemonUnreachableError,
    InvalidGitpaasDomainError,
    InvalidLogRetentionError,
    PlatformUpToDateError,
    UnknownPlatformVersionError,
    UpdateAlreadyRunningError,
} from '../server.errors';

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

describe('InvalidGitpaasDomainError', () => {
    it('is a DomainError', () => {
        expect(new InvalidGitpaasDomainError()).toBeInstanceOf(DomainError);
    });

    it('sets its name to InvalidGitpaasDomainError', () => {
        expect(new InvalidGitpaasDomainError().name).toBe('InvalidGitpaasDomainError');
    });

    it('carries the INVALID_GITPAAS_DOMAIN code', () => {
        expect(new InvalidGitpaasDomainError().code).toBe('INVALID_GITPAAS_DOMAIN');
    });

    it('states the rule of a host name in its message', () => {
        expect(new InvalidGitpaasDomainError().message).toBe(DOMAIN_HOST_MESSAGE);
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('bad host');

        expect(new InvalidGitpaasDomainError({ cause: original }).cause).toBe(original);
    });
});

describe('UpdateAlreadyRunningError', () => {
    it('is a DomainError', () => {
        expect(new UpdateAlreadyRunningError()).toBeInstanceOf(DomainError);
    });

    it('sets its name to UpdateAlreadyRunningError', () => {
        expect(new UpdateAlreadyRunningError().name).toBe('UpdateAlreadyRunningError');
    });

    it('carries the UPDATE_ALREADY_RUNNING code', () => {
        expect(new UpdateAlreadyRunningError().code).toBe('UPDATE_ALREADY_RUNNING');
    });

    it('asks the operator to wait for the update that runs', () => {
        expect(new UpdateAlreadyRunningError().message)
            .toBe('An update of the platform already runs. Wait for it to end before you start another one.');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('a row still runs');

        expect(new UpdateAlreadyRunningError({ cause: original }).cause).toBe(original);
    });
});

describe('PlatformUpToDateError', () => {
    it('is a DomainError', () => {
        expect(new PlatformUpToDateError('2.2.0')).toBeInstanceOf(DomainError);
    });

    it('sets its name to PlatformUpToDateError', () => {
        expect(new PlatformUpToDateError('2.2.0').name).toBe('PlatformUpToDateError');
    });

    it('carries the PLATFORM_UP_TO_DATE code', () => {
        expect(new PlatformUpToDateError('2.2.0').code).toBe('PLATFORM_UP_TO_DATE');
    });

    it('names the version the platform already runs in its message', () => {
        expect(new PlatformUpToDateError('2.2.0').message)
            .toBe('The platform already runs the version 2.2.0, which is the latest release.');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('same version');

        expect(new PlatformUpToDateError('2.2.0', { cause: original }).cause).toBe(original);
    });
});

describe('UnknownPlatformVersionError', () => {
    it('is a DomainError', () => {
        expect(new UnknownPlatformVersionError()).toBeInstanceOf(DomainError);
    });

    it('sets its name to UnknownPlatformVersionError', () => {
        expect(new UnknownPlatformVersionError().name).toBe('UnknownPlatformVersionError');
    });

    it('carries the UNKNOWN_PLATFORM_VERSION code', () => {
        expect(new UnknownPlatformVersionError().code).toBe('UNKNOWN_PLATFORM_VERSION');
    });

    it('states that a version of the comparison is unknown', () => {
        expect(new UnknownPlatformVersionError().message)
            .toBe('The version of the installation or of the latest release is unknown, so no update can start.');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('no release');

        expect(new UnknownPlatformVersionError({ cause: original }).cause).toBe(original);
    });
});
