import type { PruneResult } from '@gitpaas/contracts';

import { ServerPruner } from '../domain/ports/server-pruner.port';

/**
 * Use case for removing every unused image and every stopped container of the host
 *
 * @param pruner Server pruner repository
 *
 * @returns Number of resources removed and disk space reclaimed
 */
export function pruneHostUseCase(pruner: ServerPruner): Promise<PruneResult> {
    return pruner.pruneHost();
}
