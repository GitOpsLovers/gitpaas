import { UpdateServiceDto } from '../../domain/dtos/update-service.dto';
import { Service } from '../../domain/models/service.model';
import { ServicesRepository } from '../../domain/repositories/services.repository';
import { updateServiceUseCase } from '../update-service.use-case';

describe('updateServiceUseCase', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';
    const updateDto: UpdateServiceDto = {
        name: 'api',
        repositoryId: '42',
        deploymentBranch: 'main',
        composerPath: 'docker-compose.yml',
    };

    const updatedService: Service = {
        id,
        name: updateDto.name,
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

    it('delegates the update to the repository with the provided id and DTO', async () => {
        repository.update.mockResolvedValue(updatedService);

        await updateServiceUseCase(repository, id, updateDto);

        expect(repository.update).toHaveBeenCalledTimes(1);
        expect(repository.update).toHaveBeenCalledWith(id, updateDto);
    });

    it('returns the service updated by the repository', async () => {
        repository.update.mockResolvedValue(updatedService);

        const result = await updateServiceUseCase(repository, id, updateDto);

        expect(result).toBe(updatedService);
    });

    it('returns null when the service does not exist', async () => {
        repository.update.mockResolvedValue(null);

        const result = await updateServiceUseCase(repository, id, updateDto);

        expect(result).toBeNull();
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        repository.update.mockRejectedValue(error);

        await expect(updateServiceUseCase(repository, id, updateDto)).rejects.toThrow(error);
    });
});
