import type { PlatformUpdate, PlatformUpdateStatus } from '@gitpaas/contracts';

import type { LatestRelease } from '../../domain/models/platform-release.models';
import type { LatestReleaseStore } from '../../domain/ports/latest-release-store.port';
import type { PlatformUpdatesRepository } from '../../domain/repositories/platform-updates.repository';
import { getPlatformUpdateUseCase } from '../get-platform-update.use-case';

describe('getPlatformUpdateUseCase', () => {
    const release: LatestRelease = { tag: 'v2.2.0', version: '2.2.0' };
    const update: PlatformUpdate = {
        id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        targetVersion: 'v2.2.0',
        step: 'Pulling the images ...',
        percent: 60,
        state: 'running',
        error: null,
        startedAt: '2026-08-28T10:00:00.000Z',
    };

    let mockPlatformUpdatesRepository: jest.Mocked<Pick<PlatformUpdatesRepository, 'findLast'>>;
    let mockLatestReleaseStore: jest.Mocked<Pick<LatestReleaseStore, 'read'>>;

    /** Runs the use case with the mocked ports, for the given installed version. */
    const run = (installedVersion = '2.1.0'): Promise<PlatformUpdateStatus> => getPlatformUpdateUseCase(
        mockPlatformUpdatesRepository as unknown as PlatformUpdatesRepository,
        mockLatestReleaseStore as unknown as LatestReleaseStore,
        installedVersion,
    );

    beforeEach(() => {
        jest.clearAllMocks();

        mockPlatformUpdatesRepository = { findLast: jest.fn().mockResolvedValue(update) };
        mockLatestReleaseStore = { read: jest.fn().mockReturnValue(release) };
    });

    it('answers the installed version, the latest version and the last update', async () => {
        const result = await run('2.1.0');

        expect(result).toEqual({ installedVersion: '2.1.0', latestVersion: '2.2.0', update });
        expect(mockPlatformUpdatesRepository.findLast).toHaveBeenCalledTimes(1);
    });

    it('answers no latest version while no check stored one', async () => {
        mockLatestReleaseStore.read.mockReturnValue(null);

        const result = await run();

        expect(result.latestVersion).toBeNull();
    });

    it('answers no update while the platform ran none', async () => {
        mockPlatformUpdatesRepository.findLast.mockResolvedValue(null);

        const result = await run();

        expect(result.update).toBeNull();
    });

    it('propagates a failure of the repository', async () => {
        const error = new Error('connection terminated');

        mockPlatformUpdatesRepository.findLast.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
