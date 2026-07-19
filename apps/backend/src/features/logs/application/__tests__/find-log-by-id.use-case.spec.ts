import { Log } from '../../domain/models/log.model';
import { LogsRepository } from '../../domain/repositories/logs.repository';
import { findLogByIdUseCase } from '../find-log-by-id.use-case';

describe('findLogByIdUseCase', () => {
    const id = 'a1b2c3d4-0000-0000-0000-000000000000';

    let mockLogsRepository: jest.Mocked<Pick<LogsRepository, 'findById'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockLogsRepository = {
            findById: jest.fn(),
        };
    });

    it('delegates to the repository with the id and returns the log entry', async () => {
        const log = { id } as Log;
        mockLogsRepository.findById.mockResolvedValue(log);

        const result = await findLogByIdUseCase(mockLogsRepository as unknown as LogsRepository, id);

        expect(mockLogsRepository.findById).toHaveBeenCalledWith(id);
        expect(result).toBe(log);
    });

    it('returns null when the log entry does not exist', async () => {
        mockLogsRepository.findById.mockResolvedValue(null);

        const result = await findLogByIdUseCase(mockLogsRepository as unknown as LogsRepository, id);

        expect(result).toBeNull();
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('db unreachable');
        mockLogsRepository.findById.mockRejectedValue(error);

        await expect(
            findLogByIdUseCase(mockLogsRepository as unknown as LogsRepository, id),
        ).rejects.toThrow(error);
    });
});
