import { ConfigService } from '@nestjs/config';

import type { LatestRelease } from '../../../domain/models/platform-release.models';
import type { LatestReleaseStore } from '../../../domain/ports/latest-release-store.port';
import type { ReleaseSource } from '../../../domain/ports/release-source.port';
import { CheckLatestReleaseJob } from '../check-latest-release.job';

import type { AppLogger } from '@core/domain/ports/app-logger.port';

describe('CheckLatestReleaseJob', () => {
    const release: LatestRelease = { tag: 'v2.2.0', version: '2.2.0' };

    let mockReleaseSource: jest.Mocked<Pick<ReleaseSource, 'findLatestRelease'>>;
    let mockLatestReleaseStore: jest.Mocked<Pick<LatestReleaseStore, 'read' | 'write'>>;
    let mockLogger: jest.Mocked<AppLogger>;
    let sut: CheckLatestReleaseJob;

    /** Builds the job, with the check of the update enabled or disabled by the setting. */
    const buildJob = (enabled = true): CheckLatestReleaseJob => new CheckLatestReleaseJob(
        mockReleaseSource,
        mockLatestReleaseStore,
        mockLogger,
        { get: jest.fn().mockReturnValue(enabled) } as unknown as ConfigService,
    );

    beforeEach(() => {
        jest.clearAllMocks();

        mockReleaseSource = { findLatestRelease: jest.fn().mockResolvedValue(release) };
        mockLatestReleaseStore = { read: jest.fn(), write: jest.fn() };
        mockLogger = {
            debug: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn(),
        };

        sut = buildJob();
    });

    it('keeps the release the source publishes', async () => {
        await sut.checkLatestRelease();

        expect(mockReleaseSource.findLatestRelease).toHaveBeenCalledTimes(1);
        expect(mockLatestReleaseStore.write).toHaveBeenCalledWith(release);
    });

    it('keeps nothing when the source publishes no release', async () => {
        mockReleaseSource.findLatestRelease.mockResolvedValue(null);

        await sut.checkLatestRelease();

        expect(mockLatestReleaseStore.write).not.toHaveBeenCalled();
        expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('reads the release once the backend boots', async () => {
        await sut.onApplicationBootstrap();

        expect(mockReleaseSource.findLatestRelease).toHaveBeenCalledTimes(1);
        expect(mockLatestReleaseStore.write).toHaveBeenCalledWith(release);
    });

    describe('when the setting disables the check', () => {
        beforeEach(() => {
            sut = buildJob(false);
        });

        it('reads no release on the schedule', async () => {
            await sut.checkLatestRelease();

            expect(mockReleaseSource.findLatestRelease).not.toHaveBeenCalled();
            expect(mockLatestReleaseStore.write).not.toHaveBeenCalled();
        });

        it('reads no release at the boot of the backend', async () => {
            await sut.onApplicationBootstrap();

            expect(mockReleaseSource.findLatestRelease).not.toHaveBeenCalled();
        });
    });

    describe('when the run fails', () => {
        const error = new Error('github is unreachable');

        beforeEach(() => {
            mockReleaseSource.findLatestRelease.mockRejectedValue(error);
        });

        it('writes the failure into the log of the application, and throws nothing', async () => {
            await expect(sut.checkLatestRelease()).resolves.toBeUndefined();

            expect(mockLogger.error).toHaveBeenCalledTimes(1);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to read the latest release of GitPaaS',
                error,
                'CheckLatestReleaseJob',
            );
        });

        it('lets the next run try again', async () => {
            await sut.checkLatestRelease();
            mockReleaseSource.findLatestRelease.mockResolvedValue(release);

            await sut.checkLatestRelease();

            expect(mockLatestReleaseStore.write).toHaveBeenCalledTimes(1);
        });
    });
});
