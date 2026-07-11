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
            composerPath: 'docker-compose.yml',
            triggeredBy: 'marc.fernandez@icmb.es',
            error: null,
            createdAt: new Date('2026-07-11T00:00:00.000Z'),
            finishedAt: new Date('2026-07-11T00:05:00.000Z'),
        },
    ];

    let repository: jest.Mocked<DeploymentsRepository>;

    beforeEach(() => {
        repository = {
            getAllByService: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };
    });

    it('delegates the lookup to the repository with the provided service id', async () => {
        repository.getAllByService.mockResolvedValue(deployments);

        await getDeploymentsByServiceUseCase(repository, serviceId);

        expect(repository.getAllByService).toHaveBeenCalledTimes(1);
        expect(repository.getAllByService).toHaveBeenCalledWith(serviceId);
    });

    it('returns the deployments listed by the repository', async () => {
        repository.getAllByService.mockResolvedValue(deployments);

        const result = await getDeploymentsByServiceUseCase(repository, serviceId);

        expect(result).toBe(deployments);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        repository.getAllByService.mockRejectedValue(error);

        await expect(getDeploymentsByServiceUseCase(repository, serviceId)).rejects.toThrow(error);
    });
});
