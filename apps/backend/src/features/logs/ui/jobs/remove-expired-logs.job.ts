import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

import { removeExpiredLogsUseCase } from '../../application/remove-expired-logs.use-case';
import { removeExpiredRuntimeLogsUseCase } from '../../application/remove-expired-runtime-logs.use-case';
import { LOG_RETENTION_BATCH_SIZE } from '../../domain/constants/log-retention.constants';
import type { LogsRepository } from '../../domain/repositories/logs.repository';
import type { RuntimeLogsRepository } from '../../domain/repositories/runtime-logs.repository';
import { DatabaseLogsRepository } from '../../infrastructure/database/db-logs.repository';
import { DatabaseRuntimeLogsRepository } from '../../infrastructure/database/db-runtime-logs.repository';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';
import type { PlatformSettingsRepository } from '@features/server/domain/repositories/platform-settings.repository';
import { DatabasePlatformSettingsRepository } from '@features/server/infrastructure/database/db-platform-settings.repository';

/**
 * Archived logs sweep job
 */
@Injectable()
export class RemoveExpiredLogsJob {
    /**
     * The number of days a line of the output of a container stays.
     */
    private readonly runtimeRetentionDays: number;

    constructor(
        @Inject(DatabaseLogsRepository)
        private readonly repository: LogsRepository,
        @Inject(DatabasePlatformSettingsRepository)
        private readonly settings: PlatformSettingsRepository,
        @Inject(DatabaseRuntimeLogsRepository)
        private readonly runtimeRepository: RuntimeLogsRepository,
        @Inject(NestLoggerAdapter) private readonly logger: AppLogger,
        config: ConfigService,
    ) {
        this.runtimeRetentionDays = config.getOrThrow<number>('RUNTIME_LOGS_RETENTION_DAYS');
    }

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

    /**
     * Removes the lines of the output of the containers that passed the retention of the configuration.
     */
    @Cron(CronExpression.EVERY_HOUR)
    public async removeExpiredRuntimeLogs(): Promise<void> {
        try {
            const removed = await removeExpiredRuntimeLogsUseCase(
                this.runtimeRepository,
                this.runtimeRetentionDays,
                new Date(),
                LOG_RETENTION_BATCH_SIZE,
            );

            if (removed > 0) {
                this.logger.log(`Removed ${removed} expired runtime log line(s)`, RemoveExpiredLogsJob.name);
            }
        } catch (error) {
            this.logger.error('Failed to remove the expired runtime log lines', error, RemoveExpiredLogsJob.name);
        }
    }
}
