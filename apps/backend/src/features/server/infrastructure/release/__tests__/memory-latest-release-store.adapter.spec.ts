import type { LatestRelease } from '../../../domain/models/platform-release.models';
import { MemoryLatestReleaseStoreAdapter } from '../memory-latest-release-store.adapter';

describe('MemoryLatestReleaseStoreAdapter', () => {
    const release: LatestRelease = { tag: 'v2.2.0', version: '2.2.0' };

    let sut: MemoryLatestReleaseStoreAdapter;

    beforeEach(() => {
        sut = new MemoryLatestReleaseStoreAdapter();
    });

    it('reads null while no check wrote a release', () => {
        expect(sut.read()).toBeNull();
    });

    it('reads the release the last check wrote', () => {
        sut.write(release);

        expect(sut.read()).toBe(release);
    });

    it('replaces the release a former check wrote', () => {
        sut.write(release);
        sut.write({ tag: 'v2.3.0', version: '2.3.0' });

        expect(sut.read()).toEqual({ tag: 'v2.3.0', version: '2.3.0' });
    });

    it('keeps the release of one instance out of another one', () => {
        sut.write(release);

        expect(new MemoryLatestReleaseStoreAdapter().read()).toBeNull();
    });
});
