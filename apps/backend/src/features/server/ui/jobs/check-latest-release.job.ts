import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

import { checkLatestReleaseUseCase } from '../../application/check-latest-release.use-case';
import type { LatestReleaseStore } from '../../domain/ports/latest-release-store.port';
import type { ReleaseSource } from '../../domain/ports/release-source.port';
import { GithubReleaseSourceAdapter } from '../../infrastructure/release/github-release-source.adapter';
import { MemoryLatestReleaseStoreAdapter } from '../../infrastructure/release/memory-latest-release-store.adapter';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';

/**
 * Latest release check job
 */
@Injectable()
export class CheckLatestReleaseJob implements OnApplicationBootstrap {
    private readonly enabled: boolean;

    constructor(
        @Inject(GithubReleaseSourceAdapter)
        private readonly source: ReleaseSource,
        @Inject(MemoryLatestReleaseStoreAdapter)
        private readonly store: LatestReleaseStore,
        @Inject(NestLoggerAdapter) private readonly logger: AppLogger,
        config: ConfigService,
    ) {
        this.enabled = config.get<boolean>('UPDATE_CHECK_ENABLED', true);
    }

    /**
     * Reads the latest release once the backend boots.
     */
    public async onApplicationBootstrap(): Promise<void> {
        await this.checkLatestRelease();
    }

    /**
     * Reads the latest release GitPaaS published, and keeps it for the screen of the update.
     */
    @Cron(CronExpression.EVERY_6_HOURS)
    public async checkLatestRelease(): Promise<void> {
        if (!this.enabled) {
            return;
        }

        try {
            const release = await checkLatestReleaseUseCase(this.source, this.store);

            if (release !== null) {
                this.logger.debug(`The latest release of GitPaaS is ${release.tag}`, CheckLatestReleaseJob.name);
            }
        } catch (error) {
            this.logger.error('Failed to read the latest release of GitPaaS', error, CheckLatestReleaseJob.name);
        }
    }
}
