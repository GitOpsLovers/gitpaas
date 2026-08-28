import type { PlatformUpdateStatus } from '@gitpaas/contracts';

import { PlatformUpdateView } from '../domain/models/platform-update.model';

/**
 * View of a screen that read no state of the update yet.
 */
const EMPTY_VIEW: PlatformUpdateView = {
    installedVersion: null,
    latestVersion: null,
    available: false,
    running: false,
    failed: false,
    finished: false,
    step: null,
    percent: 0,
    error: null,
};

/**
 * Maps the state of the update the API answers into the view the panel shows.
 *
 * @param status State of the update, when the answer arrived
 *
 * @returns State of the update as the panel shows it
 */
export function mapPlatformUpdateUseCase(status: PlatformUpdateStatus | undefined): PlatformUpdateView {
    if (!status) {
        return EMPTY_VIEW;
    }

    const { installedVersion, latestVersion, update } = status;

    return {
        installedVersion,
        latestVersion,
        available: latestVersion !== null && latestVersion !== installedVersion,
        running: update?.state === 'running',
        failed: update?.state === 'failed',
        finished: update?.state === 'completed' && update.targetVersion === installedVersion,
        step: update?.step ?? null,
        percent: update?.percent ?? 0,
        error: update?.error ?? null,
    };
}
