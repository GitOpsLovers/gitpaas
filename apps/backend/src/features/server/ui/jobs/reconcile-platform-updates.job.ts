import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';

import { reconcilePlatformUpdatesUseCase } from '../../application/reconcile-platform-updates.use-case';
import type { PlatformUpdatesRepository } from '../../domain/repositories/platform-updates.repository';
import { DatabasePlatformUpdatesRepository } from '../../infrastructure/database/db-platform-updates.repository';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';

/**
 * Platform updates reconciliation job
 */
@Injectable()
export class ReconcilePlatformUpdatesJob implements OnApplicationBootstrap {
    constructor(
        @Inject(DatabasePlatformUpdatesRepository)
        private readonly updates: PlatformUpdatesRepository,
        @Inject(NestLoggerAdapter) private readonly logger: AppLogger,
    ) {}

    /**
     * Closes the rows of the updates that no run reports to any more, once the backend boots.
     */
    public async onApplicationBootstrap(): Promise<void> {
        await this.reconcilePlatformUpdates();
    }

    /**
     * Closes as failed every row of an update that still runs while the run it belongs to left no report.
     */
    public async reconcilePlatformUpdates(): Promise<void> {
        try {
            const closed = await reconcilePlatformUpdatesUseCase(this.updates);

            if (closed > 0) {
                this.logger.warn(
                    `Closed ${closed} update(s) of the platform that left no report`,
                    ReconcilePlatformUpdatesJob.name,
                );
            }
        } catch (error) {
            this.logger.error(
                'Failed to close the updates of the platform that left no report',
                error,
                ReconcilePlatformUpdatesJob.name,
            );
        }
    }
}
