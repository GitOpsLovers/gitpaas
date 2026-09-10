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

    /**
     * Removes every unused image and every stopped container of the host, whatever their origin.
     *
     * @returns Prune result with the number of resources removed and space reclaimed
     */
    pruneHost: () => Promise<PruneResult>;

    /**
     * Removes the whole build cache of the builder.
     *
     * @returns Prune result with the number of cache records removed and space reclaimed
     */
    pruneBuildCache: () => Promise<PruneResult>;
}
