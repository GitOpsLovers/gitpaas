/**
 * Normalized outcome of a Docker prune operation on the VPS.
 */
export interface PruneResult {
    deletedCount: number;
    spaceReclaimed: number;
}
