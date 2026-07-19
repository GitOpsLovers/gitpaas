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

    let mockServicesRepository: jest.Mocked<Pick<ServicesRepository, 'findById'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockServicesRepository = {
            findById: jest.fn(),
        };
    });

    it('delegates the lookup to the repository with the provided id', async () => {
        mockServicesRepository.findById.mockResolvedValue(service);

        await findServiceByIdUseCase(mockServicesRepository as unknown as ServicesRepository, id);

        expect(mockServicesRepository.findById).toHaveBeenCalledTimes(1);
        expect(mockServicesRepository.findById).toHaveBeenCalledWith(id);
    });

    it('returns the service found by the repository', async () => {
        mockServicesRepository.findById.mockResolvedValue(service);

        const result = await findServiceByIdUseCase(mockServicesRepository as unknown as ServicesRepository, id);

        expect(result).toBe(service);
    });

    it('returns null when the service does not exist', async () => {
        mockServicesRepository.findById.mockResolvedValue(null);

        const result = await findServiceByIdUseCase(mockServicesRepository as unknown as ServicesRepository, id);

        expect(result).toBeNull();
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        mockServicesRepository.findById.mockRejectedValue(error);

        await expect(
            findServiceByIdUseCase(mockServicesRepository as unknown as ServicesRepository, id),
        ).rejects.toThrow(error);
    });
});
