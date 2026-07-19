import { Service } from '../../domain/models/service.model';
import { ServicesRepository } from '../../domain/repositories/services.repository';
import { getServicesByProjectUseCase } from '../get-services-by-project.use-case';

describe('getServicesByProjectUseCase', () => {
    const projectId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

    const services: Service[] = [
        {
            id: '9c858901-8a57-4791-81fe-4c455b099bc9',
            name: 'api',
            projectId,
            repositoryId: '42',
            deploymentBranch: 'main',
            composerPath: 'docker-compose.yml',
        },
    ];

    let mockServicesRepository: jest.Mocked<Pick<ServicesRepository, 'getAllByProject'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockServicesRepository = {
            getAllByProject: jest.fn(),
        };
    });

    it('delegates the lookup to the repository with the provided project id', async () => {
        mockServicesRepository.getAllByProject.mockResolvedValue(services);

        await getServicesByProjectUseCase(mockServicesRepository as unknown as ServicesRepository, projectId);

        expect(mockServicesRepository.getAllByProject).toHaveBeenCalledTimes(1);
        expect(mockServicesRepository.getAllByProject).toHaveBeenCalledWith(projectId);
    });

    it('returns the services listed by the repository', async () => {
        mockServicesRepository.getAllByProject.mockResolvedValue(services);

        const result = await getServicesByProjectUseCase(mockServicesRepository as unknown as ServicesRepository, projectId);

        expect(result).toBe(services);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        mockServicesRepository.getAllByProject.mockRejectedValue(error);

        await expect(
            getServicesByProjectUseCase(mockServicesRepository as unknown as ServicesRepository, projectId),
        ).rejects.toThrow(error);
    });
});
