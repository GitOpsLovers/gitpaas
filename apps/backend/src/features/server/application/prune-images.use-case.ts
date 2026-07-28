import { PruneResult } from '../domain/models/prune-result.models';
import { ServerPrunerRepository } from '../domain/repositories/server-pruner.repository';

/**
 * Use case for removing dangling images from the server
 *
 * @param pruner Server pruner repository
 *
 * @returns Number of images removed and disk space reclaimed
 */
export function pruneImagesUseCase(pruner: ServerPrunerRepository): Promise<PruneResult> {
    return pruner.pruneImages();
}
