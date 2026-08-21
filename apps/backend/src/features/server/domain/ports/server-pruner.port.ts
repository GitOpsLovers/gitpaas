import type { PruneResult } from '@gitpaas/contracts';

/**
 * Server pruner port
 */
export interface ServerPruner {
    /**
     * Removes dangling images.
     *
     * @returns Prune result with the number of images removed and space reclaimed
     */
    pruneImages: () => Promise<PruneResult>;

    /**
     * Removes unused local volumes.
     *
     * @returns Prune result with the number of volumes removed and space reclaimed
     */
    pruneVolumes: () => Promise<PruneResult>;

    /**
     * Removes stopped containers.
     *
     * @returns Prune result with the number of containers removed and space reclaimed
     */
    pruneContainers: () => Promise<PruneResult>;
}
