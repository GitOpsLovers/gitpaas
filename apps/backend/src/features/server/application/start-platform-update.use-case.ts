import type { PlatformUpdateStatus } from '@gitpaas/contracts';

import {
    PlatformUpToDateError,
    UnknownPlatformVersionError,
    UpdateAlreadyRunningError,
} from '../domain/errors/server.errors';
import type { LatestReleaseStore } from '../domain/ports/latest-release-store.port';
import type { UpdateRunner } from '../domain/ports/update-runner.port';
import type { PlatformUpdatesRepository } from '../domain/repositories/platform-updates.repository';

import { TELEMETRY_UNKNOWN_VERSION } from '@core/domain/constants/telemetry.constants';

/**
 * Starts the update of the platform towards the latest release.
 *
 * @param updates Platform updates repository
 * @param store Store of the latest release
 * @param runner Runner of the update
 * @param installedVersion Version the running image reports about itself
 *
 * @returns The versions of the installation and the update that started
 *
 * @throws UpdateAlreadyRunningError When an update of the platform still runs
 * @throws UnknownPlatformVersionError When the installed version or the latest release is unknown
 * @throws PlatformUpToDateError When the platform already runs the latest release
 */
export async function startPlatformUpdateUseCase(
    updates: PlatformUpdatesRepository,
    store: LatestReleaseStore,
    runner: UpdateRunner,
    installedVersion: string,
): Promise<PlatformUpdateStatus> {
    const last = await updates.findLast();

    if (last?.state === 'running') {
        throw new UpdateAlreadyRunningError();
    }

    const latest = store.read();

    if (latest === null || installedVersion === TELEMETRY_UNKNOWN_VERSION) {
        throw new UnknownPlatformVersionError();
    }

    if (latest.version === installedVersion) {
        throw new PlatformUpToDateError(installedVersion);
    }

    const update = await updates.open(latest.tag);

    try {
        await runner.start(update.id, latest.tag);
    } catch (error) {
        // The row exists already, so a failure of the start would leave it running for ever.
        await updates.fail(update.id, error instanceof Error ? error.message : String(error));

        throw error;
    }

    return { installedVersion, latestVersion: latest.version, update };
}
