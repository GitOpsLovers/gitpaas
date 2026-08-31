import type { LatestRelease } from '../models/platform-release.models';

/**
 * Source of the releases of GitPaaS.
 */
export interface ReleaseSource {
    /**
     * Reads the latest release the project published
     *
     * @returns The latest release, or `null` when the source publishes none
     *
     * @throws ReleaseSourceUnavailableError When the source does not answer, or refuses the read
     */
    findLatestRelease: () => Promise<LatestRelease | null>;
}
