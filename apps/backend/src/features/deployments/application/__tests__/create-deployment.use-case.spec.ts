import { CreateDeploymentDto } from '../../domain/dtos/create-deployment.dto';
import { Deployment } from '../../domain/models/deployment.model';
import { DeploymentsRepository } from '../../domain/repositories/deployments.repository';
import { createDeploymentUseCase } from '../create-deployment.use-case';

describe('createDeploymentUseCase', () => {
    const createDto: CreateDeploymentDto = {
        serviceId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        branch: 'main',
        commit: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
        commitMessage: 'Fix deployment healthcheck parsing',
        composerPath: 'docker-compose.yml',
        triggeredBy: 'marc.fernandez@icmb.es',
    };

    const createdDeployment: Deployment = {
        id: '9c858901-8a57-4791-81fe-4c455b099bc9',
        serviceId: createDto.serviceId,
        status: 'pending',
        branch: createDto.branch,
        commit: createDto.commit,
        commitMessage: createDto.commitMessage,
        composerPath: createDto.composerPath,
        triggeredBy: createDto.triggeredBy,
        error: null,
        createdAt: new Date('2026-07-11T00:00:00.000Z'),
        finishedAt: null,
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

    it('delegates creation to the repository with the provided DTO', async () => {
        repository.create.mockResolvedValue(createdDeployment);

        await createDeploymentUseCase(repository, createDto);

        expect(repository.create).toHaveBeenCalledTimes(1);
        expect(repository.create).toHaveBeenCalledWith(createDto);
    });

    it('returns the deployment created by the repository', async () => {
        repository.create.mockResolvedValue(createdDeployment);

        const result = await createDeploymentUseCase(repository, createDto);

        expect(result).toBe(createdDeployment);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        repository.create.mockRejectedValue(error);

        await expect(createDeploymentUseCase(repository, createDto)).rejects.toThrow(error);
    });
});
