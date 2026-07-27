/**
 * Whether a single dependency is reachable.
 */
export type DependencyState = 'up' | 'down';

/**
 * Reachability of one critical dependency probed during a readiness check.
 */
export interface DependencyStatus {
    name: string;
    status: DependencyState;
}

/**
 * Aggregate readiness of the server: `ok` only when every dependency is `up`.
 */
export type ReadinessState = 'ok' | 'error';

/**
 * Outcome of a readiness check: overall status plus a per-dependency breakdown.
 */
export interface ReadinessResult {
    status: ReadinessState;
    dependencies: DependencyStatus[];
}
