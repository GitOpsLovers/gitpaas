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

    let mockServicesRepository: jest.Mocked<Pick<ServicesRepository, 'update'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockServicesRepository = {
            update: jest.fn(),
        };
    });

    it('delegates the update to the repository with the provided id and DTO', async () => {
        mockServicesRepository.update.mockResolvedValue(updatedService);

        await updateServiceUseCase(mockServicesRepository as unknown as ServicesRepository, id, updateDto);

        expect(mockServicesRepository.update).toHaveBeenCalledTimes(1);
        expect(mockServicesRepository.update).toHaveBeenCalledWith(id, updateDto);
    });

    it('returns the service updated by the repository', async () => {
        mockServicesRepository.update.mockResolvedValue(updatedService);

        const result = await updateServiceUseCase(mockServicesRepository as unknown as ServicesRepository, id, updateDto);

        expect(result).toBe(updatedService);
    });

    it('returns null when the service does not exist', async () => {
        mockServicesRepository.update.mockResolvedValue(null);

        const result = await updateServiceUseCase(mockServicesRepository as unknown as ServicesRepository, id, updateDto);

        expect(result).toBeNull();
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        mockServicesRepository.update.mockRejectedValue(error);

        await expect(
            updateServiceUseCase(mockServicesRepository as unknown as ServicesRepository, id, updateDto),
        ).rejects.toThrow(error);
    });
});
