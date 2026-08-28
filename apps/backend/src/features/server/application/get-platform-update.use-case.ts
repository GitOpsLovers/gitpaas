import type { PlatformUpdateStatus } from '@gitpaas/contracts';

import type { LatestReleaseStore } from '../domain/ports/latest-release-store.port';
import type { PlatformUpdatesRepository } from '../domain/repositories/platform-updates.repository';

/**
 * Reads the version the platform runs, the latest release the last check read, and the state of the last update.
 *
 * @param updates Platform updates repository
 * @param store Store of the latest release
 * @param installedVersion Version the running image reports about itself
 *
 * @returns The versions of the installation and the state of its last update
 */
export async function getPlatformUpdateUseCase(
    updates: PlatformUpdatesRepository,
    store: LatestReleaseStore,
    installedVersion: string,
): Promise<PlatformUpdateStatus> {
    const update = await updates.findLast();

    return {
        installedVersion,
        latestVersion: store.read()?.version ?? null,
        update,
    };
}
