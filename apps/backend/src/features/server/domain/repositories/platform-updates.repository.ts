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
}
