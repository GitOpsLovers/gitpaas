/* eslint-disable no-secrets/no-secrets */
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
        commit: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
        commitMessage: 'Fix deployment healthcheck parsing',
        composerPath: 'docker-compose.yml',
        triggeredBy: 'marc.fernandez@icmb.es',
        error: null,
        createdAt: new Date('2026-07-11T00:00:00.000Z'),
        finishedAt: new Date('2026-07-11T00:05:00.000Z'),
    };

    let mockDeploymentsRepository: jest.Mocked<Pick<DeploymentsRepository, 'findById'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockDeploymentsRepository = {
            findById: jest.fn(),
        };
    });

    it('delegates the lookup to the repository with the provided id', async () => {
        mockDeploymentsRepository.findById.mockResolvedValue(deployment);

        await findDeploymentByIdUseCase(mockDeploymentsRepository as unknown as DeploymentsRepository, id);

        expect(mockDeploymentsRepository.findById).toHaveBeenCalledTimes(1);
        expect(mockDeploymentsRepository.findById).toHaveBeenCalledWith(id);
    });

    it('returns the deployment found by the repository', async () => {
        mockDeploymentsRepository.findById.mockResolvedValue(deployment);

        const result = await findDeploymentByIdUseCase(mockDeploymentsRepository as unknown as DeploymentsRepository, id);

        expect(result).toBe(deployment);
    });

    it('returns null when the deployment does not exist', async () => {
        mockDeploymentsRepository.findById.mockResolvedValue(null);

        const result = await findDeploymentByIdUseCase(mockDeploymentsRepository as unknown as DeploymentsRepository, id);

        expect(result).toBeNull();
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        mockDeploymentsRepository.findById.mockRejectedValue(error);

        await expect(
            findDeploymentByIdUseCase(mockDeploymentsRepository as unknown as DeploymentsRepository, id),
        ).rejects.toThrow(error);
    });
});
