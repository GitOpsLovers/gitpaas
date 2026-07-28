import { PruneResult } from '../domain/models/prune-result.models';
import { ServerPruner } from '../domain/ports/server-pruner.port';

/**
 * Use case for removing dangling images from the server
 *
 * @param pruner Server pruner repository
 *
 * @returns Number of images removed and disk space reclaimed
 */
export function pruneImagesUseCase(pruner: ServerPruner): Promise<PruneResult> {
    return pruner.pruneImages();
}
