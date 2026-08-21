import { LOG_RETENTION_MAX_DAYS, LOG_RETENTION_MIN_DAYS } from '@gitpaas/contracts';

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
