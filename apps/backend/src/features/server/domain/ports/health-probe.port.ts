import type { DependencyState } from '@gitpaas/contracts';

/**
 * Health probe for a single critical dependency.
 */
export interface HealthProbe {
    /**
     * Name of the dependency this probe checks (e.g. `postgres`, `docker`).
     */
    readonly name: string;

    /**
     * Probes the dependency.
     *
     * @returns `up` when the dependency is reachable, `down` when it is not.
     */
    check: () => Promise<DependencyState>;
}
