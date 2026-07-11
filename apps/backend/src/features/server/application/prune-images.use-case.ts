import { PruneResult } from '../domain/models/prune-result.model';
import { ServerPrunerRepository } from '../domain/repositories/server-pruner.repository';

/**
 * Use case for removing dangling images from the VPS
 *
 * @param pruner Server pruner repository
 *
 * @returns Number of images removed and disk space reclaimed
 */
export function pruneImagesUseCase(pruner: ServerPrunerRepository): Promise<PruneResult> {
    return pruner.pruneImages();
}
