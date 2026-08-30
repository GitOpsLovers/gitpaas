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
