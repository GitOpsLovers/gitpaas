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
