import { PruneResult } from '../models/prune-result.model';

/**
 * Server pruner repository
 */
export interface ServerPrunerRepository {
    /**
     * Removes dangling images.
     */
    pruneImages: () => Promise<PruneResult>;

    /**
     * Removes unused local volumes.
     */
    pruneVolumes: () => Promise<PruneResult>;

    /**
     * Removes stopped containers.
     */
    pruneContainers: () => Promise<PruneResult>;
}
