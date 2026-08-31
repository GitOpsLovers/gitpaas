import type { PlatformUpdate } from '@gitpaas/contracts';

/**
 * Platform updates repository
 */
export interface PlatformUpdatesRepository {
    /**
     * Reads the update that started last
     *
     * @returns The newest update, or `null` while the platform ran none
     */
    findLast: () => Promise<PlatformUpdate | null>;

    /**
     * Opens the row of an update that starts
     *
     * @param targetVersion Tag of the release the platform moves to
     *
     * @returns The update the row holds
     */
    open: (targetVersion: string) => Promise<PlatformUpdate>;

    /**
     * Closes the row of an update as failed
     *
     * @param updateId Identifier of the row the update reports its progress into
     * @param reason Message that tells why the update ended
     */
    fail: (updateId: string, reason: string) => Promise<void>;

    /**
     * Closes as failed every row that still runs and that started before the given moment
     *
     * @param startedBefore Moment a row must have started before to count as abandoned
     * @param reason Message that tells why the update ended
     *
     * @returns Number of rows the call closed
     */
    failStale: (startedBefore: Date, reason: string) => Promise<number>;
}
