/**
 * Outcome of removing orphaned GitPaaS containers from the VPS.
 */
export interface OrphanRemovalResult {
    removed: number;
    names: string[];
}
