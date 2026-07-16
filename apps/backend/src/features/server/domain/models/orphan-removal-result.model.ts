/**
 * Normalized outcome of removing orphaned Artifactory containers from the VPS.
 */
export interface OrphanRemovalResult {
    removed: number;
    names: string[];
}
