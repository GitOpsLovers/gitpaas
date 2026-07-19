import { CreateLogDto } from '../../domain/dtos/create-log.dto';
import { Log } from '../../domain/models/log.model';
import { LogsRepository } from '../../domain/repositories/logs.repository';
import { createLogUseCase } from '../create-log.use-case';

describe('createLogUseCase', () => {
    const createDto: CreateLogDto = {
        deploymentId: 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b',
        seq: 1,
        type: 'line',
        content: 'building service',
        status: null,
    };

    let mockLogsRepository: jest.Mocked<Pick<LogsRepository, 'create'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockLogsRepository = {
            create: jest.fn(),
        };
    });

    it('delegates to the repository with the DTO and returns the created log entry', async () => {
        const created = { id: 'x' } as Log;
        mockLogsRepository.create.mockResolvedValue(created);

        const result = await createLogUseCase(mockLogsRepository as unknown as LogsRepository, createDto);

        expect(mockLogsRepository.create).toHaveBeenCalledWith(createDto);
        expect(result).toBe(created);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('db unreachable');
        mockLogsRepository.create.mockRejectedValue(error);

        await expect(
            createLogUseCase(mockLogsRepository as unknown as LogsRepository, createDto),
        ).rejects.toThrow(error);
    });
});
