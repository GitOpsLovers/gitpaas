import { Deployment } from '../../domain/models/deployment.model';
import { DeploymentsRepository } from '../../domain/repositories/deployments.repository';
import { findDeploymentByIdUseCase } from '../find-deployment-by-id.use-case';

describe('findDeploymentByIdUseCase', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';

    const deployment: Deployment = {
        id,
        serviceId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        status: 'success',
        branch: 'main',
        composerPath: 'docker-compose.yml',
        triggeredBy: 'marc.fernandez@icmb.es',
        error: null,
        createdAt: new Date('2026-07-11T00:00:00.000Z'),
        finishedAt: new Date('2026-07-11T00:05:00.000Z'),
    };

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

    it('delegates the lookup to the repository with the provided id', async () => {
        repository.findById.mockResolvedValue(deployment);

        await findDeploymentByIdUseCase(repository, id);

        expect(repository.findById).toHaveBeenCalledTimes(1);
        expect(repository.findById).toHaveBeenCalledWith(id);
    });

    it('returns the deployment found by the repository', async () => {
        repository.findById.mockResolvedValue(deployment);

        const result = await findDeploymentByIdUseCase(repository, id);

        expect(result).toBe(deployment);
    });

    it('returns null when the deployment does not exist', async () => {
        repository.findById.mockResolvedValue(null);

        const result = await findDeploymentByIdUseCase(repository, id);

        expect(result).toBeNull();
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        repository.findById.mockRejectedValue(error);

        await expect(findDeploymentByIdUseCase(repository, id)).rejects.toThrow(error);
    });
});
