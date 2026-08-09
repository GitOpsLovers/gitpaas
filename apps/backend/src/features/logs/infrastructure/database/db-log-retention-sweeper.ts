import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { LogsRepository } from '../../domain/repositories/logs.repository';

import { HOUR_IN_MS, LOG_STORE_CONTEXT } from './db-log-store.constants';
import { DatabaseLogsRepository } from './db-logs.repository';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';

/**
 * Age-based retention sweep across every deployment's stored entries.
 */
@Injectable()
export class LogRetentionSweeper {
    /** Age after which stored log entries are dropped. */
    private readonly retentionHours: number;

    constructor(
        @Inject(DatabaseLogsRepository)
        private readonly repository: LogsRepository,
        @Inject(NestLoggerAdapter)
        private readonly logger: AppLogger,
        config: ConfigService,
    ) {
        this.retentionHours = config.getOrThrow<number>('LOGS_RETENTION_HOURS');
    }

    /**
     * Enforces the age-based retention window.
     *
     * Runs opportunistically when a run completes: the backend ships no
     * scheduler, so completion is the cheapest recurring hook available.
     */
    public async sweep(): Promise<void> {
        if (this.retentionHours <= 0) {
            return;
        }

        try {
            await this.repository.deleteCreatedBefore(new Date(Date.now() - (this.retentionHours * HOUR_IN_MS)));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            this.logger.error(
                `Failed to enforce log retention: ${message}`,
                error,
                LOG_STORE_CONTEXT,
            );
        }
    }
}
