import { PruneResult } from '../../domain/models/prune-result.model';

/**
 * Normalizes a Docker prune response into the domain model, counting the
 * removed resources and defaulting missing values to zero.
 *
 * @param deleted Identifiers of the resources Docker removed, if any
 * @param spaceReclaimed Bytes of disk space Docker reclaimed, if any
 *
 * @returns Normalized prune result
 */
export function toPruneResult(
    deleted: readonly unknown[] | null | undefined,
    spaceReclaimed: number | null | undefined,
): PruneResult {
    return {
        deletedCount: deleted?.length ?? 0,
        spaceReclaimed: spaceReclaimed ?? 0,
    };
}
