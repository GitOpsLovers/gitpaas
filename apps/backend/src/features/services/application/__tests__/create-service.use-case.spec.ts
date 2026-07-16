import { CreateServiceDto } from '../../domain/dtos/create-service.dto';
import { Service } from '../../domain/models/service.model';
import { ServicesRepository } from '../../domain/repositories/services.repository';
import { createServiceUseCase } from '../create-service.use-case';

describe('createServiceUseCase', () => {
    const createDto: CreateServiceDto = {
        name: 'api',
        projectId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    };

    const createdService: Service = {
        id: '9c858901-8a57-4791-81fe-4c455b099bc9',
        name: createDto.name,
        projectId: createDto.projectId,
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

    it('delegates creation to the repository with the provided DTO', async () => {
        repository.create.mockResolvedValue(createdService);

        await createServiceUseCase(repository, createDto);

        expect(repository.create).toHaveBeenCalledTimes(1);
        expect(repository.create).toHaveBeenCalledWith(createDto);
    });

    it('returns the service created by the repository', async () => {
        repository.create.mockResolvedValue(createdService);

        const result = await createServiceUseCase(repository, createDto);

        expect(result).toBe(createdService);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        repository.create.mockRejectedValue(error);

        await expect(createServiceUseCase(repository, createDto)).rejects.toThrow(error);
    });
});
