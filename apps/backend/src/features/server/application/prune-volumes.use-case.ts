import { PruneResult } from '../domain/models/prune-result.model';
import { ServerPrunerRepository } from '../domain/repositories/server-pruner.repository';

/**
 * Use case for removing unused local volumes from the VPS
 *
 * @param pruner Server pruner repository
 *
 * @returns Number of volumes removed and disk space reclaimed
 */
export function pruneVolumesUseCase(pruner: ServerPrunerRepository): Promise<PruneResult> {
    return pruner.pruneVolumes();
}
