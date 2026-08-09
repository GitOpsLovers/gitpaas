import { ConfigService } from '@nestjs/config';

import { LogsRepository } from '../../../domain/repositories/logs.repository';
import { LogRetentionSweeper } from '../db-log-retention-sweeper';
import { HOUR_IN_MS, LOG_STORE_CONTEXT } from '../db-log-store.constants';

import type { AppLogger } from '@core/domain/ports/app-logger.port';

describe('LogRetentionSweeper', () => {
    /** Fixed instant the sweep is measured from. */
    const now = new Date('2026-01-15T12:00:00.000Z').getTime();

    let mockLogsRepository: jest.Mocked<Pick<LogsRepository, 'deleteCreatedBefore'>>;
    let mockLogger: jest.Mocked<AppLogger>;
    let mockConfigService: jest.Mocked<Pick<ConfigService, 'getOrThrow'>>;

    /** Builds a sweeper configured with a given retention window, in hours. */
    const createSut = (retentionHours: number): LogRetentionSweeper => {
        mockConfigService.getOrThrow.mockReturnValue(retentionHours);

        return new LogRetentionSweeper(
            mockLogsRepository as unknown as LogsRepository,
            mockLogger,
            mockConfigService as unknown as ConfigService,
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockLogsRepository = { deleteCreatedBefore: jest.fn().mockResolvedValue(undefined) };
        mockLogger = {
            debug: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn(),
        };
        mockConfigService = { getOrThrow: jest.fn() };

        jest.spyOn(Date, 'now').mockReturnValue(now);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('reads the retention window from LOGS_RETENTION_HOURS once, at construction', () => {
        createSut(24);

        expect(mockConfigService.getOrThrow).toHaveBeenCalledTimes(1);
        expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('LOGS_RETENTION_HOURS');
    });

    it('drops every entry older than the configured window', async () => {
        await createSut(24).sweep();

        expect(mockLogsRepository.deleteCreatedBefore).toHaveBeenCalledTimes(1);
        expect(mockLogsRepository.deleteCreatedBefore).toHaveBeenCalledWith(new Date(now - (24 * HOUR_IN_MS)));
    });

    it('measures the threshold from the current instant', async () => {
        await createSut(1).sweep();

        expect(mockLogsRepository.deleteCreatedBefore).toHaveBeenCalledWith(new Date(now - HOUR_IN_MS));
    });

    it('never sweeps when retention is disabled with zero', async () => {
        await createSut(0).sweep();

        expect(mockLogsRepository.deleteCreatedBefore).not.toHaveBeenCalled();
    });

    it('never sweeps when the retention window is negative', async () => {
        await createSut(-5).sweep();

        expect(mockLogsRepository.deleteCreatedBefore).not.toHaveBeenCalled();
    });

    it('logs a failing sweep instead of rejecting', async () => {
        const error = new Error('database down');

        mockLogsRepository.deleteCreatedBefore.mockRejectedValue(error);

        await expect(createSut(24).sweep()).resolves.toBeUndefined();
        expect(mockLogger.error).toHaveBeenCalledTimes(1);
        expect(mockLogger.error).toHaveBeenCalledWith(
            'Failed to enforce log retention: database down',
            error,
            LOG_STORE_CONTEXT,
        );
    });

    it('stringifies a thrown non-error value in the failure message', async () => {
        mockLogsRepository.deleteCreatedBefore.mockRejectedValue('connection reset');

        await expect(createSut(24).sweep()).resolves.toBeUndefined();
        expect(mockLogger.error).toHaveBeenCalledWith(
            'Failed to enforce log retention: connection reset',
            'connection reset',
            LOG_STORE_CONTEXT,
        );
    });

    it('never logs when the sweep succeeds', async () => {
        await createSut(24).sweep();

        expect(mockLogger.error).not.toHaveBeenCalled();
    });
});
