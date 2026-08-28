import type { LatestRelease } from '../models/platform-release.models';

/**
 * Store of the latest release the check of the update read.
 */
export interface LatestReleaseStore {
    /**
     * Reads the latest release the last check stored
     *
     * @returns The latest release, or `null` while no check stored one
     */
    read: () => LatestRelease | null;

    /**
     * Keeps the latest release a check read
     *
     * @param release Release to keep
     */
    write: (release: LatestRelease) => void;
}
