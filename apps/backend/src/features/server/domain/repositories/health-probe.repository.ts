/**
 * Health probe for a single critical dependency.
 *
 * Adapters implementing this port are responsible for catching their own
 * connectivity errors and resolving `false` rather than throwing.
 */
export interface HealthProbe {
    /**
     * Name of the dependency this probe checks (e.g. `postgres`, `redis`).
     */
    readonly name: string;

    /**
     * Probes the dependency.
     *
     * @returns `true` when the dependency is reachable, `false` otherwise
     */
    check: () => Promise<boolean>;
}
