import { DAY_IN_MILLISECONDS } from '../../domain/constants/log-retention.constants';
import { LogsRepository } from '../../domain/repositories/logs.repository';
import { removeExpiredLogsUseCase } from '../remove-expired-logs.use-case';

import { DEFAULT_LOG_RETENTION_DAYS } from '@features/server/domain/constants/platform-settings.constants';
import { PlatformSettingsRepository } from '@features/server/domain/repositories/platform-settings.repository';

describe('removeExpiredLogsUseCase', () => {
    const now = new Date('2026-08-21T12:00:00.000Z');
    const batchSize = 2;

    let rows: Array<{ id: string; createdAt: Date }>;
    let mockLogsRepository: jest.Mocked<Pick<LogsRepository, 'deleteCreatedBefore'>>;
    let mockPlatformSettingsRepository: jest.Mocked<Pick<PlatformSettingsRepository, 'find'>>;

    /** Builds a row that was created a number of days before the moment under test. */
    const rowAgedDays = (id: string, days: number): { id: string; createdAt: Date } => ({
        id,
        createdAt: new Date(now.getTime() - (days * DAY_IN_MILLISECONDS)),
    });

    /** Runs the use case with the mocked repositories, applying the casts one time. */
    const run = (): Promise<number> => removeExpiredLogsUseCase(
        mockLogsRepository as unknown as LogsRepository,
        mockPlatformSettingsRepository as unknown as PlatformSettingsRepository,
        now,
        batchSize,
    );

    beforeEach(() => {
        jest.clearAllMocks();

        rows = [];
        mockLogsRepository = {
            deleteCreatedBefore: jest.fn((threshold: Date, limit: number) => {
                const expired = rows
                    .filter((row) => row.createdAt.getTime() < threshold.getTime())
                    .slice(0, limit);
                rows = rows.filter((row) => !expired.includes(row));

                return Promise.resolve(expired.length);
            }),
        };
        mockPlatformSettingsRepository = { find: jest.fn().mockResolvedValue(null) };
    });

    describe('when many rows passed the age', () => {
        beforeEach(() => {
            rows = [
                rowAgedDays('expired-1', 90),
                rowAgedDays('expired-2', 60),
                rowAgedDays('expired-3', 31),
                rowAgedDays('alive-1', 29),
                rowAgedDays('alive-2', 0),
            ];
        });

        it('removes every row that passed the age, and keeps the others', async () => {
            await run();

            expect(rows.map((row) => row.id)).toEqual(['alive-1', 'alive-2']);
        });

        it('runs again until a batch removes none', async () => {
            await run();

            expect(mockLogsRepository.deleteCreatedBefore).toHaveBeenCalledTimes(3);
            expect(mockLogsRepository.deleteCreatedBefore).toHaveBeenNthCalledWith(
                1,
                new Date(now.getTime() - (DEFAULT_LOG_RETENTION_DAYS * DAY_IN_MILLISECONDS)),
                batchSize,
            );
        });

        it('returns the number of rows it removed', async () => {
            const result = await run();

            expect(result).toBe(3);
        });
    });

    describe('when the operator changed no age', () => {
        beforeEach(() => {
            rows = [
                rowAgedDays('expired', DEFAULT_LOG_RETENTION_DAYS + 1),
                rowAgedDays('alive', DEFAULT_LOG_RETENTION_DAYS - 1),
            ];
        });

        it('uses the value by default, and removes the rows that pass it', async () => {
            const result = await run();

            expect(mockPlatformSettingsRepository.find).toHaveBeenCalledTimes(1);
            expect(mockLogsRepository.deleteCreatedBefore).toHaveBeenNthCalledWith(
                1,
                new Date(now.getTime() - (DEFAULT_LOG_RETENTION_DAYS * DAY_IN_MILLISECONDS)),
                batchSize,
            );
            expect(result).toBe(1);
            expect(rows.map((row) => row.id)).toEqual(['alive']);
        });
    });

    describe('when no row passed the age', () => {
        beforeEach(() => {
            rows = [rowAgedDays('alive-1', 1)];
        });

        it('keeps every row, and removes nothing', async () => {
            const result = await run();

            expect(result).toBe(0);
            expect(rows.map((row) => row.id)).toEqual(['alive-1']);
        });

        it('asks the repository one time alone', async () => {
            await run();

            expect(mockLogsRepository.deleteCreatedBefore).toHaveBeenCalledTimes(1);
        });
    });

    describe('when the operator changed the age', () => {
        beforeEach(() => {
            rows = [rowAgedDays('older', 10), rowAgedDays('newer', 3)];
            mockPlatformSettingsRepository.find.mockResolvedValue({ logRetentionDays: 7 });
        });

        it('reads the age from the settings on every run', async () => {
            await run();

            expect(mockPlatformSettingsRepository.find).toHaveBeenCalledTimes(1);
        });

        it('judges the removal against the age the operator saved', async () => {
            await run();

            expect(mockLogsRepository.deleteCreatedBefore).toHaveBeenNthCalledWith(
                1,
                new Date(now.getTime() - (7 * DAY_IN_MILLISECONDS)),
                batchSize,
            );
            expect(rows.map((row) => row.id)).toEqual(['newer']);
        });
    });

    describe('when the removal fails', () => {
        it('propagates the error of the repository of the logs', async () => {
            const error = new Error('deadlock detected');
            mockLogsRepository.deleteCreatedBefore.mockRejectedValueOnce(error);

            await expect(run()).rejects.toThrow(error);
        });

        it('stops at the batch that failed', async () => {
            rows = [rowAgedDays('expired-1', 90), rowAgedDays('expired-2', 90)];
            mockLogsRepository.deleteCreatedBefore.mockRejectedValueOnce(new Error('deadlock detected'));

            await expect(run()).rejects.toThrow('deadlock detected');
            expect(mockLogsRepository.deleteCreatedBefore).toHaveBeenCalledTimes(1);
            expect(rows.map((row) => row.id)).toEqual(['expired-1', 'expired-2']);
        });

        it('propagates the error of the repository of the settings, and removes nothing', async () => {
            const error = new Error('connection terminated');
            mockPlatformSettingsRepository.find.mockRejectedValue(error);

            await expect(run()).rejects.toThrow(error);
            expect(mockLogsRepository.deleteCreatedBefore).not.toHaveBeenCalled();
        });
    });
});
