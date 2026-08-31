import {
    UPDATE_ABANDONED_REASON,
    UPDATE_STALE_AFTER_MS,
} from '../../domain/constants/platform-update.constants';
import type { PlatformUpdatesRepository } from '../../domain/repositories/platform-updates.repository';
import { reconcilePlatformUpdatesUseCase } from '../reconcile-platform-updates.use-case';

describe('reconcilePlatformUpdatesUseCase', () => {
    const now = new Date('2026-08-28T12:00:00.000Z');
    const earlier = new Date('2026-08-28T10:00:00.000Z');

    let mockPlatformUpdatesRepository: jest.Mocked<Pick<PlatformUpdatesRepository, 'failStale'>>;

    /** Runs the use case with the mocked repository, against the given moment. */
    const run = (moment?: Date): Promise<number> => reconcilePlatformUpdatesUseCase(
        mockPlatformUpdatesRepository as unknown as PlatformUpdatesRepository,
        moment,
    );

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers().setSystemTime(now);

        mockPlatformUpdatesRepository = { failStale: jest.fn().mockResolvedValue(0) };
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('closes the rows older than the grace period, with the reason of a run that left no report', async () => {
        await run(earlier);

        expect(mockPlatformUpdatesRepository.failStale).toHaveBeenCalledTimes(1);
        expect(mockPlatformUpdatesRepository.failStale).toHaveBeenCalledWith(
            new Date(earlier.getTime() - UPDATE_STALE_AFTER_MS),
            UPDATE_ABANDONED_REASON,
        );
    });

    it('judges the age of a row against the present moment while the caller names none', async () => {
        await run();

        expect(mockPlatformUpdatesRepository.failStale).toHaveBeenCalledWith(
            new Date(now.getTime() - UPDATE_STALE_AFTER_MS),
            UPDATE_ABANDONED_REASON,
        );
    });

    it('returns the number of rows the repository closed', async () => {
        mockPlatformUpdatesRepository.failStale.mockResolvedValue(2);

        expect(await run()).toBe(2);
    });

    it('returns zero while no row was left open', async () => {
        expect(await run()).toBe(0);
    });

    it('propagates a failure of the repository', async () => {
        const error = new Error('the database refused the write');

        mockPlatformUpdatesRepository.failStale.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
