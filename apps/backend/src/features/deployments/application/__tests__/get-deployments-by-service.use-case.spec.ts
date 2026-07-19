import { Deployment } from '../../domain/models/deployment.model';
import { DeploymentsRepository } from '../../domain/repositories/deployments.repository';
import { getDeploymentsByServiceUseCase } from '../get-deployments-by-service.use-case';

describe('getDeploymentsByServiceUseCase', () => {
    const serviceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

    const deployments: Deployment[] = [
        {
            id: '9c858901-8a57-4791-81fe-4c455b099bc9',
            serviceId,
            status: 'success',
            branch: 'main',
            commit: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
            commitMessage: 'Fix deployment healthcheck parsing',
            composerPath: 'docker-compose.yml',
            triggeredBy: 'marc.fernandez@icmb.es',
            error: null,
            createdAt: new Date('2026-07-11T00:00:00.000Z'),
            finishedAt: new Date('2026-07-11T00:05:00.000Z'),
        },
    ];

    let mockDeploymentsRepository: jest.Mocked<Pick<DeploymentsRepository, 'getAllByService'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockDeploymentsRepository = {
            getAllByService: jest.fn(),
        };
    });

    it('delegates the lookup to the repository with the provided service id', async () => {
        mockDeploymentsRepository.getAllByService.mockResolvedValue(deployments);

        await getDeploymentsByServiceUseCase(mockDeploymentsRepository as unknown as DeploymentsRepository, serviceId);

        expect(mockDeploymentsRepository.getAllByService).toHaveBeenCalledTimes(1);
        expect(mockDeploymentsRepository.getAllByService).toHaveBeenCalledWith(serviceId);
    });

    it('returns the deployments listed by the repository', async () => {
        mockDeploymentsRepository.getAllByService.mockResolvedValue(deployments);

        const result = await getDeploymentsByServiceUseCase(mockDeploymentsRepository as unknown as DeploymentsRepository, serviceId);

        expect(result).toBe(deployments);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        mockDeploymentsRepository.getAllByService.mockRejectedValue(error);

        await expect(
            getDeploymentsByServiceUseCase(mockDeploymentsRepository as unknown as DeploymentsRepository, serviceId),
        ).rejects.toThrow(error);
    });
});
