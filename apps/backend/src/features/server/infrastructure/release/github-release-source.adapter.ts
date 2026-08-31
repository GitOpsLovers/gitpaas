import { Injectable } from '@nestjs/common';

import { LATEST_RELEASE_TIMEOUT_MS, LATEST_RELEASE_URL } from '../../domain/constants/platform-update.constants';
import { ReleaseSourceUnavailableError } from '../../domain/errors/server.errors';
import type { LatestRelease } from '../../domain/models/platform-release.models';
import type { ReleaseSource } from '../../domain/ports/release-source.port';

import { toLatestRelease } from './github-release.transformer';

/**
 * GitHub release source adapter
 */
@Injectable()
export class GithubReleaseSourceAdapter implements ReleaseSource {
    public async findLatestRelease(): Promise<LatestRelease | null> {
        let response: Response;

        try {
            response = await fetch(LATEST_RELEASE_URL, {
                headers: { Accept: 'application/vnd.github+json' },
                signal: AbortSignal.timeout(LATEST_RELEASE_TIMEOUT_MS),
            });
        } catch (error) {
            throw new ReleaseSourceUnavailableError(
                error instanceof Error ? error.message : String(error),
                { cause: error },
            );
        }

        if (!response.ok) {
            throw new ReleaseSourceUnavailableError(`GitHub answered ${response.status}`);
        }

        try {
            const payload: unknown = await response.json();

            return toLatestRelease(payload);
        } catch (error) {
            throw new ReleaseSourceUnavailableError(
                'GitHub answered a body that carries no release',
                { cause: error },
            );
        }
    }
}
