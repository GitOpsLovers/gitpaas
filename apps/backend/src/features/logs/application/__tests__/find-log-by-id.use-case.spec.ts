import { Log } from '../../domain/models/log.model';
import { LogsRepository } from '../../domain/repositories/logs.repository';
import { findLogByIdUseCase } from '../find-log-by-id.use-case';

describe('findLogByIdUseCase', () => {
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

    it('delegates to the repository with the id and returns the log entry', async () => {
        const log = { id } as Log;
        repository.findById.mockResolvedValue(log);

        const result = await findLogByIdUseCase(repository, id);

        expect(repository.findById).toHaveBeenCalledWith(id);
        expect(result).toBe(log);
    });

    it('returns null when the log entry does not exist', async () => {
        repository.findById.mockResolvedValue(null);

        const result = await findLogByIdUseCase(repository, id);

        expect(result).toBeNull();
    });
});
