import { Service } from '../../domain/models/service.model';
import { ServicesRepository } from '../../domain/repositories/services.repository';
import { findServiceByIdUseCase } from '../find-service-by-id.use-case';

describe('findServiceByIdUseCase', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';

    const service: Service = {
        id,
        name: 'api',
        projectId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        repositoryId: '42',
        deploymentBranch: 'main',
        composerPath: 'docker-compose.yml',
    };

    let repository: jest.Mocked<ServicesRepository>;

    beforeEach(() => {
        repository = {
            getAll: jest.fn(),
            getAllByProject: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };
    });

    it('delegates the lookup to the repository with the provided id', async () => {
        repository.findById.mockResolvedValue(service);

        await findServiceByIdUseCase(repository, id);

        expect(repository.findById).toHaveBeenCalledTimes(1);
        expect(repository.findById).toHaveBeenCalledWith(id);
    });

    it('returns the service found by the repository', async () => {
        repository.findById.mockResolvedValue(service);

        const result = await findServiceByIdUseCase(repository, id);

        expect(result).toBe(service);
    });

    it('returns null when the service does not exist', async () => {
        repository.findById.mockResolvedValue(null);

        const result = await findServiceByIdUseCase(repository, id);

        expect(result).toBeNull();
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        repository.findById.mockRejectedValue(error);

        await expect(findServiceByIdUseCase(repository, id)).rejects.toThrow(error);
    });
});
