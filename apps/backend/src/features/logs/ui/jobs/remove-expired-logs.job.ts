import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { removeExpiredLogsUseCase } from '../../application/remove-expired-logs.use-case';
import { LOG_RETENTION_BATCH_SIZE } from '../../domain/constants/log-retention.constants';
import type { LogsRepository } from '../../domain/repositories/logs.repository';
import { DatabaseLogsRepository } from '../../infrastructure/database/db-logs.repository';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';
import type { PlatformSettingsRepository } from '@features/server/domain/repositories/platform-settings.repository';
import { DatabasePlatformSettingsRepository } from '@features/server/infrastructure/database/db-platform-settings.repository';

/**
 * Archived logs sweep job
 */
@Injectable()
export class RemoveExpiredLogsJob {
    constructor(
        @Inject(DatabaseLogsRepository)
        private readonly repository: LogsRepository,
        @Inject(DatabasePlatformSettingsRepository)
        private readonly settings: PlatformSettingsRepository,
        @Inject(NestLoggerAdapter) private readonly logger: AppLogger,
    ) {}

    /**
     * Removes the archived log entries that passed the age the operator set.
     */
    @Cron(CronExpression.EVERY_HOUR)
    public async removeExpiredLogs(): Promise<void> {
        try {
            const removed = await removeExpiredLogsUseCase(
                this.repository,
                this.settings,
                new Date(),
                LOG_RETENTION_BATCH_SIZE,
            );

            if (removed > 0) {
                this.logger.log(`Removed ${removed} expired log entry(ies)`, RemoveExpiredLogsJob.name);
            }
        } catch (error) {
            this.logger.error('Failed to remove the expired log entries', error, RemoveExpiredLogsJob.name);
        }
    }
}
