import { DAY_IN_MILLISECONDS } from '../domain/constants/log-retention.constants';
import { LogsRepository } from '../domain/repositories/logs.repository';

import { getPlatformSettingsUseCase } from '@features/server/application/get-platform-settings.use-case';
import { PlatformSettingsRepository } from '@features/server/domain/repositories/platform-settings.repository';

/**
 * Use case for removing the log entries that passed the age the operator set
 *
 * @param logsRepository Logs repository
 * @param platformSettingsRepository Platform settings repository
 * @param now Moment the age is judged against
 * @param batchSize Largest number of log entries one batch removes
 *
 * @returns Number of log entries that were removed
 */
export async function removeExpiredLogsUseCase(
    logsRepository: LogsRepository,
    platformSettingsRepository: PlatformSettingsRepository,
    now: Date,
    batchSize: number,
): Promise<number> {
    const { logRetentionDays } = await getPlatformSettingsUseCase(platformSettingsRepository);
    const threshold = new Date(now.getTime() - (logRetentionDays * DAY_IN_MILLISECONDS));

    let removed = 0;
    let removedInBatch = 0;

    do {
        removedInBatch = await logsRepository.deleteCreatedBefore(threshold, batchSize);
        removed += removedInBatch;
    } while (removedInBatch > 0);

    return removed;
}
