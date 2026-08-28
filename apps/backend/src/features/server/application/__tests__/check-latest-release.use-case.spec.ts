import type { LatestRelease } from '../../domain/models/platform-release.models';
import type { LatestReleaseStore } from '../../domain/ports/latest-release-store.port';
import type { ReleaseSource } from '../../domain/ports/release-source.port';
import { checkLatestReleaseUseCase } from '../check-latest-release.use-case';

describe('checkLatestReleaseUseCase', () => {
    const release: LatestRelease = { tag: 'v2.2.0', version: '2.2.0' };

    let mockReleaseSource: jest.Mocked<Pick<ReleaseSource, 'findLatestRelease'>>;
    let mockLatestReleaseStore: jest.Mocked<Pick<LatestReleaseStore, 'read' | 'write'>>;

    /** Runs the use case with the mocked ports. */
    const run = (): Promise<LatestRelease | null> => checkLatestReleaseUseCase(
        mockReleaseSource,
        mockLatestReleaseStore,
    );

    beforeEach(() => {
        jest.clearAllMocks();

        mockReleaseSource = { findLatestRelease: jest.fn().mockResolvedValue(release) };
        mockLatestReleaseStore = { read: jest.fn(), write: jest.fn() };
    });

    it('reads the latest release from the source', async () => {
        await run();

        expect(mockReleaseSource.findLatestRelease).toHaveBeenCalledTimes(1);
    });

    it('keeps the release it read, and returns it', async () => {
        const result = await run();

        expect(mockLatestReleaseStore.write).toHaveBeenCalledTimes(1);
        expect(mockLatestReleaseStore.write).toHaveBeenCalledWith(release);
        expect(result).toBe(release);
    });

    it('keeps nothing when the source publishes no release', async () => {
        mockReleaseSource.findLatestRelease.mockResolvedValue(null);

        const result = await run();

        expect(mockLatestReleaseStore.write).not.toHaveBeenCalled();
        expect(result).toBeNull();
    });

    it('propagates a failure of the source', async () => {
        const error = new Error('github is unreachable');

        mockReleaseSource.findLatestRelease.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
        expect(mockLatestReleaseStore.write).not.toHaveBeenCalled();
    });
});
