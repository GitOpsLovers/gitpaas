import type { PruneResult } from '@gitpaas/contracts';

import { ServerPruner } from '../domain/ports/server-pruner.port';

/**
 * Use case for removing the whole build cache of the builder
 *
 * @param pruner Server pruner repository
 *
 * @returns Number of cache records removed and disk space reclaimed
 */
export function pruneBuildCacheUseCase(pruner: ServerPruner): Promise<PruneResult> {
    return pruner.pruneBuildCache();
}
