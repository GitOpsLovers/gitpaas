/* eslint-disable no-secrets/no-secrets */
import {
    UPDATE_ABANDONED_REASON,
    UPDATE_STALE_AFTER_MS,
} from '../../../domain/constants/platform-update.constants';
import { DatabasePlatformUpdatesRepository } from '../../../infrastructure/database/db-platform-updates.repository';
import { ReconcilePlatformUpdatesJob } from '../reconcile-platform-updates.job';

import type { AppLogger } from '@core/domain/ports/app-logger.port';

describe('ReconcilePlatformUpdatesJob', () => {
    const now = new Date('2026-08-28T12:00:00.000Z');

    let mockPlatformUpdatesRepository: jest.Mocked<Pick<DatabasePlatformUpdatesRepository, 'failStale'>>;
    let mockLogger: jest.Mocked<AppLogger>;
    let sut: ReconcilePlatformUpdatesJob;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers().setSystemTime(now);

        mockPlatformUpdatesRepository = { failStale: jest.fn().mockResolvedValue(0) };
        mockLogger = {
            debug: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn(),
        };

        sut = new ReconcilePlatformUpdatesJob(
            mockPlatformUpdatesRepository as unknown as DatabasePlatformUpdatesRepository,
            mockLogger,
        );
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('closes the rows older than the grace period once the backend boots', async () => {
        await sut.onApplicationBootstrap();

        expect(mockPlatformUpdatesRepository.failStale).toHaveBeenCalledTimes(1);
        expect(mockPlatformUpdatesRepository.failStale).toHaveBeenCalledWith(
            new Date(now.getTime() - UPDATE_STALE_AFTER_MS),
            UPDATE_ABANDONED_REASON,
        );
    });

    it('reports the rows it closed', async () => {
        mockPlatformUpdatesRepository.failStale.mockResolvedValue(2);

        await sut.reconcilePlatformUpdates();

        expect(mockLogger.warn).toHaveBeenCalledTimes(1);
        expect(mockLogger.warn).toHaveBeenCalledWith(
            'Closed 2 update(s) of the platform that left no report',
            ReconcilePlatformUpdatesJob.name,
        );
    });

    it('stays silent while no row was left open', async () => {
        await sut.reconcilePlatformUpdates();

        expect(mockLogger.warn).not.toHaveBeenCalled();
        expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('never breaks the boot when the repository fails', async () => {
        const error = new Error('the database refused the write');

        mockPlatformUpdatesRepository.failStale.mockRejectedValue(error);

        await expect(sut.onApplicationBootstrap()).resolves.toBeUndefined();

        expect(mockLogger.error).toHaveBeenCalledTimes(1);
        expect(mockLogger.error).toHaveBeenCalledWith(
            'Failed to close the updates of the platform that left no report',
            error,
            ReconcilePlatformUpdatesJob.name,
        );
    });
});
