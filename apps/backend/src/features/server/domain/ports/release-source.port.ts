import type { LatestRelease } from '../models/platform-release.models';

/**
 * Source of the releases of GitPaaS.
 */
export interface ReleaseSource {
    /**
     * Reads the latest release the project published
     *
     * @returns The latest release, or `null` when the source publishes none or does not answer
     */
    findLatestRelease: () => Promise<LatestRelease | null>;
}
