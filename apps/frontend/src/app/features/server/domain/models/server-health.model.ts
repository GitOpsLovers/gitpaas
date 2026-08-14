import { DependencyStatus } from './readiness-result.model';
import { ServerStatus } from './server-status.model';

/**
 * Health of the server as the panel shows it, whether the API answered `200`,
 * answered `503` with a body, or did not answer at all.
 */
export interface ReadinessHealth {
    /** Whether the readiness of the server could be read. */
    read: boolean;
    /** True only when the readiness was read and every dependency is `up`. */
    ready: boolean;
    /** State of every critical dependency, empty when the readiness could not be read. */
    dependencies: DependencyStatus[];
    /** Message of the failed reading, `null` when the readiness was read. */
    message: string | null;
}

/**
 * How the reading of the state of the Docker daemon ended.
 *
 * - `reachable`: the daemon answered, and its information is available.
 * - `unreachable`: the API answered that the daemon does not answer.
 * - `unreadable`: the state of the daemon could not be read at all.
 */
export type DaemonHealthState = 'reachable' | 'unreachable' | 'unreadable';

/**
 * State of the Docker daemon as the panel shows it.
 */
export interface DaemonHealth {
    /** How the reading ended. */
    state: DaemonHealthState;
    /** Information the daemon reports, `null` when it did not answer. */
    info: ServerStatus | null;
    /** Message shown in place of the information, `null` when the daemon answered. */
    message: string | null;
}
