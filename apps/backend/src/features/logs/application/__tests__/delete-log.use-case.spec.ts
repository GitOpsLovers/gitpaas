import { LogsRepository } from '../../domain/repositories/logs.repository';
import { deleteLogUseCase } from '../delete-log.use-case';

describe('deleteLogUseCase', () => {
    const id = 'a1b2c3d4-0000-0000-0000-000000000000';

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

    it('delegates to the repository with the id and returns true when a row was deleted', async () => {
        repository.delete.mockResolvedValue(true);

        const result = await deleteLogUseCase(repository, id);

        expect(repository.delete).toHaveBeenCalledWith(id);
        expect(result).toBe(true);
    });

    it('returns false when nothing was deleted', async () => {
        repository.delete.mockResolvedValue(false);

        const result = await deleteLogUseCase(repository, id);

        expect(result).toBe(false);
    });
});
