/**
 * Outcome of removing orphaned GitPaaS containers from the server.
 */
export interface OrphanRemovalResult {
    removed: number;
    names: string[];
}
