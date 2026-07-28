/**
 * Normalized outcome of a Docker prune operation on the server.
 */
export interface PruneResult {
    deletedCount: number;
    spaceReclaimed: number;
}
