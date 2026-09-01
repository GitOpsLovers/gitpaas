import { DAY_IN_MILLISECONDS } from '../domain/constants/log-retention.constants';
import { RuntimeLogsRepository } from '../domain/repositories/runtime-logs.repository';

/**
 * Use case for removing the lines of the output of the containers that passed the retention
 *
 * @param runtimeLogsRepository Runtime logs repository
 * @param retentionDays Number of days a line of the output stays
 * @param now Moment the age is judged against
 * @param batchSize Largest number of lines one batch removes
 *
 * @returns Number of lines that were removed
 */
export async function removeExpiredRuntimeLogsUseCase(
    runtimeLogsRepository: RuntimeLogsRepository,
    retentionDays: number,
    now: Date,
    batchSize: number,
): Promise<number> {
    const threshold = new Date(now.getTime() - (retentionDays * DAY_IN_MILLISECONDS));

    let removed = 0;
    let removedInBatch = 0;

    do {
        removedInBatch = await runtimeLogsRepository.deleteCreatedBefore(threshold, batchSize);
        removed += removedInBatch;
    } while (removedInBatch > 0);

    return removed;
}
