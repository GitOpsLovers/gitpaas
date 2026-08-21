import { DAY_IN_MILLISECONDS, LOG_RETENTION_BATCH_SIZE } from '../../../domain/constants/log-retention.constants';
import { LogsRepository } from '../../../domain/repositories/logs.repository';
import { RemoveExpiredLogsJob } from '../remove-expired-logs.job';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { DEFAULT_LOG_RETENTION_DAYS } from '@features/server/domain/constants/platform-settings.constants';
import { PlatformSettingsRepository } from '@features/server/domain/repositories/platform-settings.repository';

describe('RemoveExpiredLogsJob', () => {
    const now = new Date('2026-08-21T12:00:00.000Z');

    let mockLogsRepository: jest.Mocked<Pick<LogsRepository, 'deleteCreatedBefore'>>;
    let mockPlatformSettingsRepository: jest.Mocked<Pick<PlatformSettingsRepository, 'find'>>;
    let mockLogger: jest.Mocked<AppLogger>;
    let sut: RemoveExpiredLogsJob;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers().setSystemTime(now);

        mockLogsRepository = { deleteCreatedBefore: jest.fn().mockResolvedValue(0) };
        mockPlatformSettingsRepository = { find: jest.fn().mockResolvedValue(null) };
        mockLogger = {
            debug: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };

        sut = new RemoveExpiredLogsJob(
            mockLogsRepository as unknown as LogsRepository,
            mockPlatformSettingsRepository as unknown as PlatformSettingsRepository,
            mockLogger,
        );
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('when rows passed the age', () => {
        beforeEach(() => {
            mockLogsRepository.deleteCreatedBefore
                .mockResolvedValueOnce(LOG_RETENTION_BATCH_SIZE)
                .mockResolvedValueOnce(4)
                .mockResolvedValue(0);
        });

        it('removes them in batches, judged against the current moment', async () => {
            await sut.removeExpiredLogs();

            expect(mockLogsRepository.deleteCreatedBefore).toHaveBeenNthCalledWith(
                1,
                new Date(now.getTime() - (DEFAULT_LOG_RETENTION_DAYS * DAY_IN_MILLISECONDS)),
                LOG_RETENTION_BATCH_SIZE,
            );
        });

        it('reports the number of rows it removed', async () => {
            await sut.removeExpiredLogs();

            expect(mockLogger.log).toHaveBeenCalledTimes(1);
            expect(mockLogger.log).toHaveBeenCalledWith(
                `Removed ${LOG_RETENTION_BATCH_SIZE + 4} expired log entry(ies)`,
                'RemoveExpiredLogsJob',
            );
        });
    });

    describe('when no row passed the age', () => {
        it('reports nothing', async () => {
            await sut.removeExpiredLogs();

            expect(mockLogger.log).not.toHaveBeenCalled();
            expect(mockLogger.error).not.toHaveBeenCalled();
        });
    });

    describe('when the run fails', () => {
        const error = new Error('deadlock detected');

        beforeEach(() => {
            mockLogsRepository.deleteCreatedBefore.mockRejectedValue(error);
        });

        it('writes the failure into the log of the application, and throws nothing', async () => {
            await expect(sut.removeExpiredLogs()).resolves.toBeUndefined();

            expect(mockLogger.error).toHaveBeenCalledTimes(1);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to remove the expired log entries',
                error,
                'RemoveExpiredLogsJob',
            );
        });

        it('lets the next run try again', async () => {
            await sut.removeExpiredLogs();
            mockLogsRepository.deleteCreatedBefore.mockResolvedValue(0);

            await sut.removeExpiredLogs();

            expect(mockLogger.error).toHaveBeenCalledTimes(1);
            expect(mockLogsRepository.deleteCreatedBefore).toHaveBeenCalledTimes(2);
        });
    });
});
