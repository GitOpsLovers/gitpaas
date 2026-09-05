import { DomainError } from './domain.error';

/**
 * Raised when a call to the Docker daemon failed for a reason other than an answer of the daemon itself.
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
