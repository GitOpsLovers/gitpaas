import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { removeExpiredProviderRegistrationsUseCase } from '../../application/remove-expired-provider-registrations.use-case';
import type { ProviderRegistrationsRepository } from '../../domain/repositories/provider-registrations.repository';
import { DatabaseProviderRegistrationsRepository } from '../../infrastructure/database/db-provider-registrations.repository';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';

/**
 * Provider registrations sweep job
 */
@Injectable()
export class RemoveExpiredProviderRegistrationsJob {
    constructor(
        @Inject(DatabaseProviderRegistrationsRepository)
        private readonly repository: ProviderRegistrationsRepository,
        @Inject(NestLoggerAdapter) private readonly logger: AppLogger,
    ) {}

    /**
     * Removes the pending registrations that passed the date of the end of their life.
     */
    @Cron(CronExpression.EVERY_HOUR)
    public async removeExpiredRegistrations(): Promise<void> {
        const removed = await removeExpiredProviderRegistrationsUseCase(this.repository, new Date());

        if (removed > 0) {
            this.logger.log(
                `Removed ${removed} expired provider registration(s)`,
                RemoveExpiredProviderRegistrationsJob.name,
            );
        }
    }
}
