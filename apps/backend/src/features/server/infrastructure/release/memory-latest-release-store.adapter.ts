import { Injectable } from '@nestjs/common';

import type { LatestRelease } from '../../domain/models/platform-release.models';
import type { LatestReleaseStore } from '../../domain/ports/latest-release-store.port';

/**
 * In-memory latest release store adapter
 */
@Injectable()
export class MemoryLatestReleaseStoreAdapter implements LatestReleaseStore {
    private release: LatestRelease | null = null;

    public read(): LatestRelease | null {
        return this.release;
    }

    public write(release: LatestRelease): void {
        this.release = release;
    }
}
