import { OrphanRemovalResult } from '../models/orphan-removal-result.models';

/**
 * Orphan containers repository
 */
export interface OrphanContainersRepository {
    /**
     * Force-removes GitPaaS containers whose compose project isn't in the
     * known set.
     *
     * @param knownProjects Compose project names of the services that still exist
     */
    removeOrphaned: (knownProjects: string[]) => Promise<OrphanRemovalResult>;
}
