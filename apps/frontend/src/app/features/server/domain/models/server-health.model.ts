import type { DependencyStatus, ServerStatus } from '@gitpaas/contracts';

/**
 * State of one critical dependency as the panel shows it.
 */
export interface HealthDependency extends DependencyStatus {
    label: string;
}

/**
 * Health of the server as the panel shows it.
 */
export interface ReadinessHealth {
    read: boolean;
    ready: boolean;
    dependencies: HealthDependency[];
    message: string | null;
}

/**
 * How the reading of the state of the Docker daemon ended.
 */
export type DaemonHealthState = 'reachable' | 'unreachable' | 'unreadable';

/**
 * State of the Docker daemon as the panel shows it.
 */
export interface DaemonHealth {
    state: DaemonHealthState;
    info: ServerStatus | null;
    message: string | null;
}
