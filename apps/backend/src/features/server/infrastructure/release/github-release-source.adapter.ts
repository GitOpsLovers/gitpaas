import { Inject, Injectable } from '@nestjs/common';

import { LATEST_RELEASE_TIMEOUT_MS, LATEST_RELEASE_URL } from '../../domain/constants/platform-update.constants';
import type { LatestRelease } from '../../domain/models/platform-release.models';
import type { ReleaseSource } from '../../domain/ports/release-source.port';

import { toLatestRelease } from './github-release.transformer';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';

/**
 * GitHub release source adapter
 */
@Injectable()
export class GithubReleaseSourceAdapter implements ReleaseSource {
    constructor(@Inject(NestLoggerAdapter) private readonly logger: AppLogger) {}

    public async findLatestRelease(): Promise<LatestRelease | null> {
        try {
            const response = await fetch(LATEST_RELEASE_URL, {
                headers: { Accept: 'application/vnd.github+json' },
                signal: AbortSignal.timeout(LATEST_RELEASE_TIMEOUT_MS),
            });

            if (!response.ok) {
                this.logger.warn(
                    `GitHub answered ${response.status} to the read of the latest release`,
                    GithubReleaseSourceAdapter.name,
                );

                return null;
            }

            const payload: unknown = await response.json();

            return toLatestRelease(payload);
        } catch (error) {
            this.logger.warn(
                `Could not read the latest release of GitPaaS: ${error instanceof Error ? error.message : String(error)}`,
                GithubReleaseSourceAdapter.name,
            );

            return null;
        }
    }
}
