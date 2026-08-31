import type { LatestRelease } from '../domain/models/platform-release.models';
import type { LatestReleaseStore } from '../domain/ports/latest-release-store.port';
import type { ReleaseSource } from '../domain/ports/release-source.port';

/**
 * Reads the latest release the project published, and keeps it for the screen of the update.
 *
 * @param source Source of the releases
 * @param store Store of the latest release
 *
 * @returns The release the check read, or `null` when it read none
 *
 * @throws ReleaseSourceUnavailableError When the source does not answer, so the store keeps the release of the last check
 */
export async function checkLatestReleaseUseCase(source: ReleaseSource, store: LatestReleaseStore): Promise<LatestRelease | null> {
    const release = await source.findLatestRelease();

    if (release === null) {
        return null;
    }

    store.write(release);

    return release;
}
