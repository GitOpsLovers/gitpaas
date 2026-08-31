import { UPDATE_ABANDONED_REASON, UPDATE_STALE_AFTER_MS } from '../domain/constants/platform-update.constants';
import type { PlatformUpdatesRepository } from '../domain/repositories/platform-updates.repository';

/**
 * Closes as failed every row of an update that still runs while no run reports to it any more.
 *
 * @param updates Platform updates repository
 * @param now Moment the age of a row is judged against
 *
 * @returns Number of rows the reconciliation closed
 */
export function reconcilePlatformUpdatesUseCase(updates: PlatformUpdatesRepository, now: Date = new Date()): Promise<number> {
    const startedBefore = new Date(now.getTime() - UPDATE_STALE_AFTER_MS);

    return updates.failStale(startedBefore, UPDATE_ABANDONED_REASON);
}
