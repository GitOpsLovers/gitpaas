import { ConfigService } from '@nestjs/config';

import { LogsRepository } from '../../../domain/repositories/logs.repository';
import { LogTrimmer } from '../db-log-trimmer';

describe('LogTrimmer', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';

    let mockLogsRepository: jest.Mocked<Pick<LogsRepository, 'deleteUpToSeq'>>;
    let mockConfigService: jest.Mocked<Pick<ConfigService, 'getOrThrow'>>;

    /** Builds a trimmer configured with a given per-deployment line cap. */
    const createSut = (maxLines: number): LogTrimmer => {
        mockConfigService.getOrThrow.mockReturnValue(maxLines);

        return new LogTrimmer(
            mockLogsRepository as unknown as LogsRepository,
            mockConfigService as unknown as ConfigService,
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockLogsRepository = { deleteUpToSeq: jest.fn().mockResolvedValue(undefined) };
        mockConfigService = { getOrThrow: jest.fn() };
    });

    it('reads the line cap from LOGS_MAX_LINES once, at construction', () => {
        createSut(10);

        expect(mockConfigService.getOrThrow).toHaveBeenCalledTimes(1);
        expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('LOGS_MAX_LINES');
    });

    it('drops everything outside the window ending at the highest written sequence', async () => {
        await createSut(3).trim(id, 10);

        expect(mockLogsRepository.deleteUpToSeq).toHaveBeenCalledTimes(1);
        expect(mockLogsRepository.deleteUpToSeq).toHaveBeenCalledWith(id, 7);
    });

    it('drops a single entry once the stream grows one line past the cap', async () => {
        await createSut(3).trim(id, 4);

        expect(mockLogsRepository.deleteUpToSeq).toHaveBeenCalledWith(id, 1);
    });

    it('never trims while the stream still fits inside the cap', async () => {
        await createSut(3).trim(id, 2);

        expect(mockLogsRepository.deleteUpToSeq).not.toHaveBeenCalled();
    });

    it('never trims on the boundary, where the stream exactly fills the cap', async () => {
        await createSut(3).trim(id, 3);

        expect(mockLogsRepository.deleteUpToSeq).not.toHaveBeenCalled();
    });

    it('never trims when the cap is disabled with zero', async () => {
        await createSut(0).trim(id, 1000);

        expect(mockLogsRepository.deleteUpToSeq).not.toHaveBeenCalled();
    });

    it('never trims when the cap is negative', async () => {
        await createSut(-1).trim(id, 1000);

        expect(mockLogsRepository.deleteUpToSeq).not.toHaveBeenCalled();
    });

    it('propagates a failing delete to its caller', async () => {
        const error = new Error('delete failed');

        mockLogsRepository.deleteUpToSeq.mockRejectedValue(error);

        await expect(createSut(3).trim(id, 10)).rejects.toThrow(error);
    });
});
