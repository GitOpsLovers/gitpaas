import type { PruneResult } from '@gitpaas/contracts';

import { ServerPruner } from '../domain/ports/server-pruner.port';

/**
 * Use case for removing stopped containers from the server
 *
 * @param pruner Server pruner repository
 *
 * @returns Number of containers removed and disk space reclaimed
 */
export function pruneContainersUseCase(pruner: ServerPruner): Promise<PruneResult> {
    return pruner.pruneContainers();
}
