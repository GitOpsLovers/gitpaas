import { ConfigService } from '@nestjs/config';

import { DAY_IN_MILLISECONDS, LOG_RETENTION_BATCH_SIZE } from '../../../domain/constants/log-retention.constants';
import { LogsRepository } from '../../../domain/repositories/logs.repository';
import { RuntimeLogsRepository } from '../../../domain/repositories/runtime-logs.repository';
import { RemoveExpiredLogsJob } from '../remove-expired-logs.job';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { DEFAULT_LOG_RETENTION_DAYS } from '@features/server/domain/constants/platform-settings.constants';
import { PlatformSettingsRepository } from '@features/server/domain/repositories/platform-settings.repository';

describe('RemoveExpiredLogsJob', () => {
    const now = new Date('2026-08-21T12:00:00.000Z');
    const runtimeRetentionDays = 7;

    let mockLogsRepository: jest.Mocked<Pick<LogsRepository, 'deleteCreatedBefore'>>;
    let mockPlatformSettingsRepository: jest.Mocked<Pick<PlatformSettingsRepository, 'find'>>;
    let mockRuntimeLogsRepository: jest.Mocked<Pick<RuntimeLogsRepository, 'deleteCreatedBefore'>>;
    let mockLogger: jest.Mocked<AppLogger>;
    let mockConfig: jest.Mocked<Pick<ConfigService, 'getOrThrow'>>;
    let sut: RemoveExpiredLogsJob;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers().setSystemTime(now);

        mockLogsRepository = { deleteCreatedBefore: jest.fn().mockResolvedValue(0) };
        mockPlatformSettingsRepository = { find: jest.fn().mockResolvedValue(null) };
        mockRuntimeLogsRepository = { deleteCreatedBefore: jest.fn().mockResolvedValue(0) };
        mockConfig = { getOrThrow: jest.fn().mockReturnValue(runtimeRetentionDays) };
        mockLogger = {
            debug: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };

        sut = new RemoveExpiredLogsJob(
            mockLogsRepository as unknown as LogsRepository,
            mockPlatformSettingsRepository as unknown as PlatformSettingsRepository,
            mockRuntimeLogsRepository as unknown as RuntimeLogsRepository,
            mockLogger,
            mockConfig as unknown as ConfigService,
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

    describe('removeExpiredRuntimeLogs', () => {
        it('reads the retention of the configuration one time, at the build of the job', () => {
            expect(mockConfig.getOrThrow).toHaveBeenCalledTimes(1);
            expect(mockConfig.getOrThrow).toHaveBeenCalledWith('RUNTIME_LOGS_RETENTION_DAYS');
        });

        describe('when lines passed the retention', () => {
            beforeEach(() => {
                mockRuntimeLogsRepository.deleteCreatedBefore
                    .mockResolvedValueOnce(LOG_RETENTION_BATCH_SIZE)
                    .mockResolvedValueOnce(7)
                    .mockResolvedValue(0);
            });

            it('removes them in batches, judged against the retention and the current moment', async () => {
                await sut.removeExpiredRuntimeLogs();

                expect(mockRuntimeLogsRepository.deleteCreatedBefore).toHaveBeenNthCalledWith(
                    1,
                    new Date(now.getTime() - (runtimeRetentionDays * DAY_IN_MILLISECONDS)),
                    LOG_RETENTION_BATCH_SIZE,
                );
            });

            it('reports the number of lines it removed', async () => {
                await sut.removeExpiredRuntimeLogs();

                expect(mockLogger.log).toHaveBeenCalledTimes(1);
                expect(mockLogger.log).toHaveBeenCalledWith(
                    `Removed ${LOG_RETENTION_BATCH_SIZE + 7} expired runtime log line(s)`,
                    'RemoveExpiredLogsJob',
                );
            });

            it('touches the archived entries of the deployments with no removal', async () => {
                await sut.removeExpiredRuntimeLogs();

                expect(mockLogsRepository.deleteCreatedBefore).not.toHaveBeenCalled();
            });
        });

        describe('when no line passed the retention', () => {
            it('reports nothing', async () => {
                await sut.removeExpiredRuntimeLogs();

                expect(mockLogger.log).not.toHaveBeenCalled();
                expect(mockLogger.error).not.toHaveBeenCalled();
            });
        });

        describe('when the run fails', () => {
            const error = new Error('deadlock detected');

            beforeEach(() => {
                mockRuntimeLogsRepository.deleteCreatedBefore.mockRejectedValue(error);
            });

            it('writes the failure into the log of the application, and throws nothing', async () => {
                await expect(sut.removeExpiredRuntimeLogs()).resolves.toBeUndefined();

                expect(mockLogger.error).toHaveBeenCalledTimes(1);
                expect(mockLogger.error).toHaveBeenCalledWith(
                    'Failed to remove the expired runtime log lines',
                    error,
                    'RemoveExpiredLogsJob',
                );
            });
        });
    });
});
