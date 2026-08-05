import { PruneResult } from '../../domain/models/prune-result.models';

import type { RuntimePruneReport } from '@core/domain/models/container-runtime.models';

/**
 * Narrows a container-runtime prune report into the server's domain model.
 *
 * @param report Prune report returned by the container runtime
 *
 * @returns Normalized prune result
 */
export function toPruneResult(report: RuntimePruneReport): PruneResult {
    return {
        deletedCount: report.deletedCount,
        spaceReclaimed: report.spaceReclaimed,
    };
}
