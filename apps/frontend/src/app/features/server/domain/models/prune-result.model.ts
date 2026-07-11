/**
 * Normalized outcome of a Docker prune operation on the VPS.
 */
export interface PruneResult {
    /** Number of resources (images, volumes or containers) that were removed. */
    deletedCount: number;
    /** Disk space freed by the prune, in bytes. */
    spaceReclaimed: number;
}
