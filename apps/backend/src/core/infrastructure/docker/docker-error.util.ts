import { DaemonUnreachableError } from '../../domain/errors/container-runtime.errors';

/**
 * Lowest status code of a failure the daemon itself reported, and not of a failure to reach it.
 */
const DAEMON_FAILURE_STATUS = 500;

/**
 * Wraps a failure of a call to the Docker daemon in the domain error the UI edge labels.
 *
 * @param error Failure dockerode raised
 *
 * @returns The original error when the daemon answered, a `DaemonUnreachableError` otherwise
 */
export function toDaemonFailure(error: unknown): unknown {
    if (error instanceof DaemonUnreachableError) {
        return error;
    }

    const statusCode = (error as { statusCode?: unknown } | null | undefined)?.statusCode;

    if (typeof statusCode === 'number' && statusCode < DAEMON_FAILURE_STATUS) {
        return error;
    }

    return new DaemonUnreachableError({ cause: error });
}
