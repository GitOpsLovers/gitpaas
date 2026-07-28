import { PruneResult } from '../domain/models/prune-result.models';
import { ServerPruner } from '../domain/ports/server-pruner.port';

/**
 * Use case for removing unused local volumes from the server
 *
 * @param pruner Server pruner repository
 *
 * @returns Number of volumes removed and disk space reclaimed
 */
export function pruneVolumesUseCase(pruner: ServerPruner): Promise<PruneResult> {
    return pruner.pruneVolumes();
}
