import { PruneResult } from '../domain/models/prune-result.model';
import { ServerPrunerRepository } from '../domain/repositories/server-pruner.repository';

/**
 * Use case for removing stopped containers from the VPS
 *
 * @param pruner Server pruner repository
 *
 * @returns Number of containers removed and disk space reclaimed
 */
export function pruneContainersUseCase(pruner: ServerPrunerRepository): Promise<PruneResult> {
    return pruner.pruneContainers();
}
