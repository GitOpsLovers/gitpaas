import { LogsRepository } from '../../../domain/repositories/logs.repository';
import { sweepRetention } from '../db-log-retention-sweeper';
import { HOUR_IN_MS, LOG_STORE_CONTEXT } from '../db-log-store.constants';

import type { AppLogger } from '@core/domain/ports/app-logger.port';

describe('sweepRetention', () => {
    /** Fixed instant the sweep is measured from. */
    const now = new Date('2026-01-15T12:00:00.000Z').getTime();

    let mockLogsRepository: jest.Mocked<Pick<LogsRepository, 'deleteCreatedBefore'>>;
    let mockLogger: jest.Mocked<AppLogger>;

    /** Sweeps over the shared fakes with a given retention window, in hours. */
    const sut = (retentionHours: number): Promise<void> =>
        sweepRetention(mockLogsRepository as unknown as LogsRepository, mockLogger, retentionHours);

    beforeEach(() => {
        jest.clearAllMocks();

        mockLogsRepository = { deleteCreatedBefore: jest.fn().mockResolvedValue(undefined) };
        mockLogger = {
            debug: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn(),
        };

        jest.spyOn(Date, 'now').mockReturnValue(now);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('drops every entry older than the configured window', async () => {
        await sut(24);

        expect(mockLogsRepository.deleteCreatedBefore).toHaveBeenCalledTimes(1);
        expect(mockLogsRepository.deleteCreatedBefore).toHaveBeenCalledWith(new Date(now - (24 * HOUR_IN_MS)));
    });

    it('measures the threshold from the current instant', async () => {
        await sut(1);

        expect(mockLogsRepository.deleteCreatedBefore).toHaveBeenCalledWith(new Date(now - HOUR_IN_MS));
    });

    it('never sweeps when retention is disabled with zero', async () => {
        await sut(0);

        expect(mockLogsRepository.deleteCreatedBefore).not.toHaveBeenCalled();
    });

    it('never sweeps when the retention window is negative', async () => {
        await sut(-5);

        expect(mockLogsRepository.deleteCreatedBefore).not.toHaveBeenCalled();
    });

    it('logs a failing sweep instead of rejecting', async () => {
        const error = new Error('database down');

        mockLogsRepository.deleteCreatedBefore.mockRejectedValue(error);

        await expect(sut(24)).resolves.toBeUndefined();
        expect(mockLogger.error).toHaveBeenCalledTimes(1);
        expect(mockLogger.error).toHaveBeenCalledWith(
            'Failed to enforce log retention: database down',
            error,
            LOG_STORE_CONTEXT,
        );
    });

    it('stringifies a thrown non-error value in the failure message', async () => {
        mockLogsRepository.deleteCreatedBefore.mockRejectedValue('connection reset');

        await expect(sut(24)).resolves.toBeUndefined();
        expect(mockLogger.error).toHaveBeenCalledWith(
            'Failed to enforce log retention: connection reset',
            'connection reset',
            LOG_STORE_CONTEXT,
        );
    });

    it('never logs when the sweep succeeds', async () => {
        await sut(24);

        expect(mockLogger.error).not.toHaveBeenCalled();
    });
});
