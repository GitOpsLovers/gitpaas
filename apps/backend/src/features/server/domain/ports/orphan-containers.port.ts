import type { OrphanRemovalResult } from '@gitpaas/contracts';

/**
 * Orphan containers port
 */
export interface OrphanContainers {
    /**
     * Force-removes GitPaaS containers whose service isn't in the known set.
     *
     * @param knownServiceIds Identifiers of the services that still exist
     *
     * @returns Number of orphaned containers removed and their friendly names
     */
    removeOrphaned: (knownServiceIds: string[]) => Promise<OrphanRemovalResult>;
}
