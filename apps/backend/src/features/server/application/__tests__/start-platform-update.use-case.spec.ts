import type { PlatformUpdate, PlatformUpdateStatus } from '@gitpaas/contracts';

import {
    PlatformUpToDateError,
    UnknownPlatformVersionError,
    UpdateAlreadyRunningError,
} from '../../domain/errors/server.errors';
import type { LatestRelease } from '../../domain/models/platform-release.models';
import type { LatestReleaseStore } from '../../domain/ports/latest-release-store.port';
import type { UpdateRunner } from '../../domain/ports/update-runner.port';
import type { PlatformUpdatesRepository } from '../../domain/repositories/platform-updates.repository';
import { startPlatformUpdateUseCase } from '../start-platform-update.use-case';

import { TELEMETRY_UNKNOWN_VERSION } from '@core/domain/constants/telemetry.constants';

describe('startPlatformUpdateUseCase', () => {
    const release: LatestRelease = { tag: 'v2.2.0', version: '2.2.0' };

    /** Builds the row of an update, overriding only the fields under test. */
    const platformUpdate = (overrides: Partial<PlatformUpdate> = {}): PlatformUpdate => ({
        id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        targetVersion: 'v2.2.0',
        step: 'starting',
        percent: 0,
        state: 'running',
        error: null,
        startedAt: '2026-08-28T10:00:00.000Z',
        ...overrides,
    });

    const openedUpdate = platformUpdate();

    let mockPlatformUpdatesRepository: jest.Mocked<Pick<PlatformUpdatesRepository, 'findLast' | 'open' | 'fail'>>;
    let mockLatestReleaseStore: jest.Mocked<Pick<LatestReleaseStore, 'read'>>;
    let mockUpdateRunner: jest.Mocked<Pick<UpdateRunner, 'start'>>;

    /** Runs the use case with the mocked ports, for the given installed version. */
    const run = (installedVersion = '2.1.0'): Promise<PlatformUpdateStatus> => startPlatformUpdateUseCase(
        mockPlatformUpdatesRepository as unknown as PlatformUpdatesRepository,
        mockLatestReleaseStore as unknown as LatestReleaseStore,
        mockUpdateRunner,
        installedVersion,
    );

    beforeEach(() => {
        jest.clearAllMocks();

        mockPlatformUpdatesRepository = {
            findLast: jest.fn().mockResolvedValue(null),
            open: jest.fn().mockResolvedValue(openedUpdate),
            fail: jest.fn().mockResolvedValue(undefined),
        };
        mockLatestReleaseStore = { read: jest.fn().mockReturnValue(release) };
        mockUpdateRunner = { start: jest.fn().mockResolvedValue(undefined) };
    });

    it('opens the row of the update on the tag of the latest release', async () => {
        await run();

        expect(mockPlatformUpdatesRepository.open).toHaveBeenCalledTimes(1);
        expect(mockPlatformUpdatesRepository.open).toHaveBeenCalledWith('v2.2.0');
    });

    it('starts the runner on the row it opened', async () => {
        await run();

        expect(mockUpdateRunner.start).toHaveBeenCalledTimes(1);
        expect(mockUpdateRunner.start).toHaveBeenCalledWith(openedUpdate.id, 'v2.2.0');
    });

    it('opens the row before it starts the runner, so the frontend follows the update', async () => {
        const order: string[] = [];

        // eslint-disable-next-line @typescript-eslint/require-await
        mockPlatformUpdatesRepository.open.mockImplementation(async () => {
            order.push('open');

            return openedUpdate;
        });
        // eslint-disable-next-line @typescript-eslint/require-await
        mockUpdateRunner.start.mockImplementation(async () => {
            order.push('start');
        });

        await run();

        expect(order).toEqual(['open', 'start']);
    });

    it('answers the versions and the update that started', async () => {
        const result = await run('2.1.0');

        expect(result).toEqual({ installedVersion: '2.1.0', latestVersion: '2.2.0', update: openedUpdate });
    });

    it('starts while the last update ended', async () => {
        mockPlatformUpdatesRepository.findLast.mockResolvedValue(platformUpdate({ state: 'completed', percent: 100 }));

        await expect(run()).resolves.toEqual(expect.objectContaining({ update: openedUpdate }));
    });

    it('starts while the last update failed', async () => {
        mockPlatformUpdatesRepository.findLast.mockResolvedValue(platformUpdate({ state: 'failed', error: 'boom' }));

        await expect(run()).resolves.toEqual(expect.objectContaining({ update: openedUpdate }));
    });

    describe('when an update still runs', () => {
        beforeEach(() => {
            mockPlatformUpdatesRepository.findLast.mockResolvedValue(platformUpdate({ state: 'running' }));
        });

        it('refuses the start', async () => {
            await expect(run()).rejects.toBeInstanceOf(UpdateAlreadyRunningError);
        });

        it('opens no row, and starts no runner', async () => {
            await run().catch(() => undefined);

            expect(mockPlatformUpdatesRepository.open).not.toHaveBeenCalled();
            expect(mockUpdateRunner.start).not.toHaveBeenCalled();
        });
    });

    describe('when a version of the comparison is unknown', () => {
        it('refuses the start while the installed version is unknown', async () => {
            await expect(run(TELEMETRY_UNKNOWN_VERSION)).rejects.toBeInstanceOf(UnknownPlatformVersionError);
        });

        it('refuses the start while no check read a release', async () => {
            mockLatestReleaseStore.read.mockReturnValue(null);

            await expect(run()).rejects.toBeInstanceOf(UnknownPlatformVersionError);
        });

        it('opens no row, and starts no runner', async () => {
            await run(TELEMETRY_UNKNOWN_VERSION).catch(() => undefined);

            expect(mockPlatformUpdatesRepository.open).not.toHaveBeenCalled();
            expect(mockUpdateRunner.start).not.toHaveBeenCalled();
        });
    });

    describe('when the platform runs the latest release', () => {
        it('refuses the start', async () => {
            await expect(run('2.2.0')).rejects.toBeInstanceOf(PlatformUpToDateError);
        });

        it('names the version it already runs', async () => {
            await expect(run('2.2.0')).rejects.toThrow('The platform already runs the version 2.2.0');
        });

        it('opens no row, and starts no runner', async () => {
            await run('2.2.0').catch(() => undefined);

            expect(mockPlatformUpdatesRepository.open).not.toHaveBeenCalled();
            expect(mockUpdateRunner.start).not.toHaveBeenCalled();
        });
    });

    describe('when the runner fails to start', () => {
        const error = new Error('the daemon refused the container');

        beforeEach(() => {
            mockUpdateRunner.start.mockRejectedValue(error);
        });

        it('propagates the failure', async () => {
            await expect(run()).rejects.toThrow(error);
        });

        it('closes the row it opened, with the reason of the failure', async () => {
            await run().catch(() => undefined);

            expect(mockPlatformUpdatesRepository.fail).toHaveBeenCalledTimes(1);
            expect(mockPlatformUpdatesRepository.fail).toHaveBeenCalledWith(
                openedUpdate.id,
                'the daemon refused the container',
            );
        });

        it('closes the row with the text of a failure that is no error', async () => {
            mockUpdateRunner.start.mockRejectedValue('the socket vanished');

            await run().catch(() => undefined);

            expect(mockPlatformUpdatesRepository.fail).toHaveBeenCalledWith(openedUpdate.id, 'the socket vanished');
        });

        it('closes the row before the failure reaches the caller', async () => {
            const order: string[] = [];

            // eslint-disable-next-line @typescript-eslint/require-await
            mockPlatformUpdatesRepository.fail.mockImplementation(async () => {
                order.push('fail');
            });

            await run().catch(() => order.push('threw'));

            expect(order).toEqual(['fail', 'threw']);
        });
    });

    it('never closes the row while the runner starts', async () => {
        await run();

        expect(mockPlatformUpdatesRepository.fail).not.toHaveBeenCalled();
    });
});
