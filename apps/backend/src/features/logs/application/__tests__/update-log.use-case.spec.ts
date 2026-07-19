import { UpdateLogDto } from '../../domain/dtos/update-log.dto';
import { Log } from '../../domain/models/log.model';
import { LogsRepository } from '../../domain/repositories/logs.repository';
import { updateLogUseCase } from '../update-log.use-case';

describe('updateLogUseCase', () => {
    const id = 'a1b2c3d4-0000-0000-0000-000000000000';
    const updateDto: UpdateLogDto = { content: 'edited line' };

    let mockLogsRepository: jest.Mocked<Pick<LogsRepository, 'update'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockLogsRepository = {
            update: jest.fn(),
        };
    });

    it('delegates to the repository with the id and DTO and returns the updated log entry', async () => {
        const updated = { id } as Log;
        mockLogsRepository.update.mockResolvedValue(updated);

        const result = await updateLogUseCase(mockLogsRepository as unknown as LogsRepository, id, updateDto);

        expect(mockLogsRepository.update).toHaveBeenCalledWith(id, updateDto);
        expect(result).toBe(updated);
    });

    it('returns null when the log entry does not exist', async () => {
        mockLogsRepository.update.mockResolvedValue(null);

        const result = await updateLogUseCase(mockLogsRepository as unknown as LogsRepository, id, updateDto);

        expect(result).toBeNull();
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('db unreachable');
        mockLogsRepository.update.mockRejectedValue(error);

        await expect(
            updateLogUseCase(mockLogsRepository as unknown as LogsRepository, id, updateDto),
        ).rejects.toThrow(error);
    });
});
