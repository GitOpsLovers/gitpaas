import { LogsRepository } from '../../domain/repositories/logs.repository';
import { deleteLogUseCase } from '../delete-log.use-case';

describe('deleteLogUseCase', () => {
    const id = 'a1b2c3d4-0000-0000-0000-000000000000';

    let mockLogsRepository: jest.Mocked<Pick<LogsRepository, 'delete'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockLogsRepository = {
            delete: jest.fn(),
        };
    });

    it('delegates to the repository with the id and returns true when a row was deleted', async () => {
        mockLogsRepository.delete.mockResolvedValue(true);

        const result = await deleteLogUseCase(mockLogsRepository as unknown as LogsRepository, id);

        expect(mockLogsRepository.delete).toHaveBeenCalledWith(id);
        expect(result).toBe(true);
    });

    it('returns false when nothing was deleted', async () => {
        mockLogsRepository.delete.mockResolvedValue(false);

        const result = await deleteLogUseCase(mockLogsRepository as unknown as LogsRepository, id);

        expect(result).toBe(false);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('db unreachable');
        mockLogsRepository.delete.mockRejectedValue(error);

        await expect(
            deleteLogUseCase(mockLogsRepository as unknown as LogsRepository, id),
        ).rejects.toThrow(error);
    });
});
