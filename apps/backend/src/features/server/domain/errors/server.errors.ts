import { DOMAIN_HOST_MESSAGE, LOG_RETENTION_MAX_DAYS, LOG_RETENTION_MIN_DAYS } from '@gitpaas/contracts';

import { DomainError } from '@core/domain/errors/domain.error';

/**
 * Raised when the server cannot reach its Docker daemon.
 */
export class DaemonUnreachableError extends DomainError {
    constructor(options?: ErrorOptions) {
        super(
            'DAEMON_UNREACHABLE',
            'Could not reach the server Docker daemon',
            options,
        );
    }
}

/**
 * Raised when the age of an archived log row falls outside the limits that the platform allows.
 */
export class InvalidLogRetentionError extends DomainError {
    constructor(options?: ErrorOptions) {
        super(
            'INVALID_LOG_RETENTION',
            `The age of a log must be a whole number of days between ${LOG_RETENTION_MIN_DAYS} and ${LOG_RETENTION_MAX_DAYS}`,
            options,
        );
    }
}

/**
 * Raised when the host the control plane must answer on breaks the rule of a host name.
 */
export class InvalidGitpaasDomainError extends DomainError {
    constructor(options?: ErrorOptions) {
        super(
            'INVALID_GITPAAS_DOMAIN',
            DOMAIN_HOST_MESSAGE,
            options,
        );
    }
}

/**
 * Raised when the host the control plane must answer on resolves nowhere near this host.
 */
export class GitpaasDomainNotPointingAtHostError extends DomainError {
    constructor(host: string, resolvedAddresses: string[], hostAddress: string, options?: ErrorOptions) {
        const resolved = resolvedAddresses.length === 0
            ? 'nothing'
            : resolvedAddresses.join(', ');

        super(
            'GITPAAS_DOMAIN_NOT_POINTING_AT_HOST',
            `The domain ${host} resolves to ${resolved}, and this host answers on ${hostAddress}. Point the record A of ${host} at ${hostAddress}, then save again.`,
            options,
        );
    }
}

/**
 * Raised when the platform cannot read the public address of its own host, so it checks nothing.
 */
export class HostAddressUnknownError extends DomainError {
    constructor(options?: ErrorOptions) {
        super(
            'HOST_ADDRESS_UNKNOWN',
            'The platform could not read the public address of this host, so it cannot check the domain. Try again in a moment.',
            options,
        );
    }
}

/**
 * Raised when the settings are kept, and the file of the environment of the stack refuses the write.
 */
export class ControlPlaneEnvWriteError extends DomainError {
    constructor(path: string, options?: ErrorOptions) {
        super(
            'CONTROL_PLANE_ENV_WRITE_FAILED',
            `The settings are kept, and ${path} could not be written. Edit that file on the host, then restart the stack.`,
            options,
        );
    }
}

/**
 * Raised when an update of the platform starts while another one still runs.
 */
export class UpdateAlreadyRunningError extends DomainError {
    constructor(options?: ErrorOptions) {
        super(
            'UPDATE_ALREADY_RUNNING',
            'An update of the platform already runs. Wait for it to end before you start another one.',
            options,
        );
    }
}

/**
 * Raised when an update of the platform starts while the platform runs the latest release.
 */
export class PlatformUpToDateError extends DomainError {
    constructor(version: string, options?: ErrorOptions) {
        super(
            'PLATFORM_UP_TO_DATE',
            `The platform already runs the version ${version}, which is the latest release.`,
            options,
        );
    }
}

/**
 * Raised when an update of the platform starts while a version of the comparison is unknown.
 */
export class UnknownPlatformVersionError extends DomainError {
    constructor(options?: ErrorOptions) {
        super(
            'UNKNOWN_PLATFORM_VERSION',
            'The version of the installation or of the latest release is unknown, so no update can start.',
            options,
        );
    }
}

/**
 * Raised when the source of the releases of GitPaaS does not answer the check of the update.
 */
export class ReleaseSourceUnavailableError extends DomainError {
    constructor(reason: string, options?: ErrorOptions) {
        super(
            'RELEASE_SOURCE_UNAVAILABLE',
            `Could not read the latest release of GitPaaS: ${reason}. Try again in a moment.`,
            options,
        );
    }
}
