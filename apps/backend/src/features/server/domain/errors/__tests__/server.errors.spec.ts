import { DOMAIN_HOST_MESSAGE } from '@gitpaas/contracts';

import {
    ControlPlaneEnvWriteError,
    DaemonUnreachableError,
    GitpaasDomainNotPointingAtHostError,
    HostAddressUnknownError,
    InvalidGitpaasDomainError,
    InvalidLogRetentionError,
    PlatformUpToDateError,
    ReleaseSourceUnavailableError,
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

describe('GitpaasDomainNotPointingAtHostError', () => {
    /** Builds the error with the addresses of one failed check. */
    const error = (resolvedAddresses: string[] = ['198.51.100.7']): GitpaasDomainNotPointingAtHostError =>
        new GitpaasDomainNotPointingAtHostError('gitpaas.example.com', resolvedAddresses, '203.0.113.10');

    it('is a DomainError', () => {
        expect(error()).toBeInstanceOf(DomainError);
    });

    it('sets its name to GitpaasDomainNotPointingAtHostError', () => {
        expect(error().name).toBe('GitpaasDomainNotPointingAtHostError');
    });

    it('carries the GITPAAS_DOMAIN_NOT_POINTING_AT_HOST code', () => {
        expect(error().code).toBe('GITPAAS_DOMAIN_NOT_POINTING_AT_HOST');
    });

    it('names the host, the address it resolves to and the address of this host in its message', () => {
        expect(error().message).toBe(
            'The domain gitpaas.example.com resolves to 198.51.100.7, and this host answers on 203.0.113.10.'
            + ' Point the record A of gitpaas.example.com at 203.0.113.10, then save again.',
        );
    });

    it('lists every address the host resolves to', () => {
        expect(error(['198.51.100.7', '192.0.2.5']).message).toContain('resolves to 198.51.100.7, 192.0.2.5');
    });

    it('states that the host resolves to nothing when it resolves to no address', () => {
        expect(error([]).message).toContain('resolves to nothing');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('ENOTFOUND');

        expect(
            new GitpaasDomainNotPointingAtHostError('gitpaas.example.com', [], '203.0.113.10', { cause: original })
                .cause,
        ).toBe(original);
    });
});

describe('HostAddressUnknownError', () => {
    it('is a DomainError', () => {
        expect(new HostAddressUnknownError()).toBeInstanceOf(DomainError);
    });

    it('sets its name to HostAddressUnknownError', () => {
        expect(new HostAddressUnknownError().name).toBe('HostAddressUnknownError');
    });

    it('carries the HOST_ADDRESS_UNKNOWN code', () => {
        expect(new HostAddressUnknownError().code).toBe('HOST_ADDRESS_UNKNOWN');
    });

    it('states that the check could not run in its message', () => {
        expect(new HostAddressUnknownError().message).toBe(
            'The platform could not read the public address of this host, so it cannot check the domain.'
            + ' Try again in a moment.',
        );
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('ETIMEDOUT');

        expect(new HostAddressUnknownError({ cause: original }).cause).toBe(original);
    });
});

describe('ControlPlaneEnvWriteError', () => {
    it('is a DomainError', () => {
        expect(new ControlPlaneEnvWriteError('/opt/gitpaas/iac/production/.env')).toBeInstanceOf(DomainError);
    });

    it('sets its name to ControlPlaneEnvWriteError', () => {
        expect(new ControlPlaneEnvWriteError('/opt/gitpaas/iac/production/.env').name)
            .toBe('ControlPlaneEnvWriteError');
    });

    it('carries the CONTROL_PLANE_ENV_WRITE_FAILED code', () => {
        expect(new ControlPlaneEnvWriteError('/opt/gitpaas/iac/production/.env').code)
            .toBe('CONTROL_PLANE_ENV_WRITE_FAILED');
    });

    it('states that the settings are kept and names the file in its message', () => {
        expect(new ControlPlaneEnvWriteError('/opt/gitpaas/iac/production/.env').message).toBe(
            'The settings are kept, and /opt/gitpaas/iac/production/.env could not be written.'
            + ' Edit that file on the host, then restart the stack.',
        );
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('EACCES');

        expect(new ControlPlaneEnvWriteError('/opt/gitpaas/iac/production/.env', { cause: original }).cause)
            .toBe(original);
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

describe('ReleaseSourceUnavailableError', () => {
    it('is a DomainError', () => {
        expect(new ReleaseSourceUnavailableError('GitHub answered 403')).toBeInstanceOf(DomainError);
    });

    it('sets its name to ReleaseSourceUnavailableError', () => {
        expect(new ReleaseSourceUnavailableError('GitHub answered 403').name).toBe('ReleaseSourceUnavailableError');
    });

    it('carries the RELEASE_SOURCE_UNAVAILABLE code', () => {
        expect(new ReleaseSourceUnavailableError('GitHub answered 403').code).toBe('RELEASE_SOURCE_UNAVAILABLE');
    });

    it('names the reason the source gave in its message', () => {
        expect(new ReleaseSourceUnavailableError('GitHub answered 403').message)
            .toBe('Could not read the latest release of GitPaaS: GitHub answered 403. Try again in a moment.');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('network unreachable');

        expect(new ReleaseSourceUnavailableError('network unreachable', { cause: original }).cause).toBe(original);
    });
});
