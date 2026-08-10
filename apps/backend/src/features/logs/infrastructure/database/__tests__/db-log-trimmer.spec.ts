import { LogsRepository } from '../../../domain/repositories/logs.repository';
import { trimStream } from '../db-log-trimmer';

describe('trimStream', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';

    let mockLogsRepository: jest.Mocked<Pick<LogsRepository, 'deleteUpToSeq'>>;

    /** Trims over the shared repository stand-in with a given per-deployment line cap. */
    const sut = (maxLines: number): (streamId: string, lastSeq: number) => Promise<void> =>
        (streamId: string, lastSeq: number): Promise<void> =>
            trimStream(mockLogsRepository as unknown as LogsRepository, streamId, lastSeq, maxLines);

    beforeEach(() => {
        jest.clearAllMocks();

        mockLogsRepository = { deleteUpToSeq: jest.fn().mockResolvedValue(undefined) };
    });

    it('drops everything outside the window ending at the highest written sequence', async () => {
        await sut(3)(id, 10);

        expect(mockLogsRepository.deleteUpToSeq).toHaveBeenCalledTimes(1);
        expect(mockLogsRepository.deleteUpToSeq).toHaveBeenCalledWith(id, 7);
    });

    it('drops a single entry once the stream grows one line past the cap', async () => {
        await sut(3)(id, 4);

        expect(mockLogsRepository.deleteUpToSeq).toHaveBeenCalledWith(id, 1);
    });

    it('never trims while the stream still fits inside the cap', async () => {
        await sut(3)(id, 2);

        expect(mockLogsRepository.deleteUpToSeq).not.toHaveBeenCalled();
    });

    it('never trims on the boundary, where the stream exactly fills the cap', async () => {
        await sut(3)(id, 3);

        expect(mockLogsRepository.deleteUpToSeq).not.toHaveBeenCalled();
    });

    it('never trims when the cap is disabled with zero', async () => {
        await sut(0)(id, 1000);

        expect(mockLogsRepository.deleteUpToSeq).not.toHaveBeenCalled();
    });

    it('never trims when the cap is negative', async () => {
        await sut(-1)(id, 1000);

        expect(mockLogsRepository.deleteUpToSeq).not.toHaveBeenCalled();
    });

    it('propagates a failing delete to its caller', async () => {
        const error = new Error('delete failed');

        mockLogsRepository.deleteUpToSeq.mockRejectedValue(error);

        await expect(sut(3)(id, 10)).rejects.toThrow(error);
    });
});
