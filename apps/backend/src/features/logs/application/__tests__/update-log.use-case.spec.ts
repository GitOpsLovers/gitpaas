import { UpdateLogDto } from '../../domain/dtos/update-log.dto';
import { Log } from '../../domain/models/log.model';
import { LogsRepository } from '../../domain/repositories/logs.repository';
import { updateLogUseCase } from '../update-log.use-case';

describe('updateLogUseCase', () => {
    const id = 'a1b2c3d4-0000-0000-0000-000000000000';
    const updateDto: UpdateLogDto = { content: 'edited line' };

    let repository: jest.Mocked<LogsRepository>;

    beforeEach(() => {
        repository = {
            getAllByDeployment: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            createMany: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };
    });

    it('delegates to the repository with the id and DTO and returns the updated log entry', async () => {
        const updated = { id } as Log;
        repository.update.mockResolvedValue(updated);

        const result = await updateLogUseCase(repository, id, updateDto);

        expect(repository.update).toHaveBeenCalledWith(id, updateDto);
        expect(result).toBe(updated);
    });

    it('returns null when the log entry does not exist', async () => {
        repository.update.mockResolvedValue(null);

        const result = await updateLogUseCase(repository, id, updateDto);

        expect(result).toBeNull();
    });
});
