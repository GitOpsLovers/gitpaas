/* eslint-disable no-secrets/no-secrets */
import { DAY_IN_MILLISECONDS } from '../../domain/constants/log-retention.constants';
import { RuntimeLogsRepository } from '../../domain/repositories/runtime-logs.repository';
import { removeExpiredRuntimeLogsUseCase } from '../remove-expired-runtime-logs.use-case';

describe('removeExpiredRuntimeLogsUseCase', () => {
    const now = new Date('2026-08-21T12:00:00.000Z');
    const retentionDays = 7;
    const batchSize = 2;

    let rows: Array<{ id: string; createdAt: Date }>;
    let mockRuntimeLogsRepository: jest.Mocked<Pick<RuntimeLogsRepository, 'deleteCreatedBefore'>>;

    /** Builds a row that was created a number of days before the moment under test. */
    const rowAgedDays = (id: string, days: number): { id: string; createdAt: Date } => ({
        id,
        createdAt: new Date(now.getTime() - (days * DAY_IN_MILLISECONDS)),
    });

    /** Runs the use case with the mocked repository, applying the cast one time. */
    const run = (days = retentionDays): Promise<number> => removeExpiredRuntimeLogsUseCase(
        mockRuntimeLogsRepository as unknown as RuntimeLogsRepository,
        days,
        now,
        batchSize,
    );

    beforeEach(() => {
        jest.clearAllMocks();

        rows = [];
        mockRuntimeLogsRepository = {
            deleteCreatedBefore: jest.fn((threshold: Date, limit: number) => {
                const expired = rows
                    .filter((row) => row.createdAt.getTime() < threshold.getTime())
                    .slice(0, limit);
                rows = rows.filter((row) => !expired.includes(row));

                return Promise.resolve(expired.length);
            }),
        };
    });

    describe('when many lines passed the retention', () => {
        beforeEach(() => {
            rows = [
                rowAgedDays('expired-1', 30),
                rowAgedDays('expired-2', 10),
                rowAgedDays('expired-3', 8),
                rowAgedDays('alive-1', 6),
                rowAgedDays('alive-2', 0),
            ];
        });

        it('removes every line that passed the retention, and keeps the others', async () => {
            await run();

            expect(rows.map((row) => row.id)).toEqual(['alive-1', 'alive-2']);
        });

        it('runs again until a batch removes none', async () => {
            await run();

            expect(mockRuntimeLogsRepository.deleteCreatedBefore).toHaveBeenCalledTimes(3);
            expect(mockRuntimeLogsRepository.deleteCreatedBefore).toHaveBeenNthCalledWith(
                1,
                new Date(now.getTime() - (retentionDays * DAY_IN_MILLISECONDS)),
                batchSize,
            );
        });

        it('returns the number of lines it removed', async () => {
            const result = await run();

            expect(result).toBe(3);
        });
    });

    describe('when the configuration names another number of days', () => {
        beforeEach(() => {
            rows = [rowAgedDays('older', 4), rowAgedDays('newer', 2)];
        });

        it('judges the removal against that number of days', async () => {
            const result = await run(3);

            expect(mockRuntimeLogsRepository.deleteCreatedBefore).toHaveBeenNthCalledWith(
                1,
                new Date(now.getTime() - (3 * DAY_IN_MILLISECONDS)),
                batchSize,
            );
            expect(result).toBe(1);
            expect(rows.map((row) => row.id)).toEqual(['newer']);
        });
    });

    describe('when no line passed the retention', () => {
        beforeEach(() => {
            rows = [rowAgedDays('alive-1', 1)];
        });

        it('keeps every line, and asks the repository one time alone', async () => {
            const result = await run();

            expect(result).toBe(0);
            expect(rows.map((row) => row.id)).toEqual(['alive-1']);
            expect(mockRuntimeLogsRepository.deleteCreatedBefore).toHaveBeenCalledTimes(1);
        });
    });

    describe('when the removal fails', () => {
        it('propagates the error, and stops at the batch that failed', async () => {
            const error = new Error('deadlock detected');
            rows = [rowAgedDays('expired-1', 30), rowAgedDays('expired-2', 30)];
            mockRuntimeLogsRepository.deleteCreatedBefore.mockRejectedValueOnce(error);

            await expect(run()).rejects.toThrow(error);
            expect(mockRuntimeLogsRepository.deleteCreatedBefore).toHaveBeenCalledTimes(1);
            expect(rows.map((row) => row.id)).toEqual(['expired-1', 'expired-2']);
        });
    });
});
