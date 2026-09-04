/* eslint-disable no-secrets/no-secrets */
import type { TriggerDeploymentDto } from '@gitpaas/contracts';

import { CreateDeploymentDto } from '../../domain/dtos/create-deployment.dto';
import { ProviderRepositoryUnreachableError, ServiceNotDeployableError } from '../../domain/errors/deployment.errors';
import { Deployment } from '../../domain/models/deployment.models';
import { DeploymentQueue } from '../../domain/ports/deployment-queue.port';
import { DeploymentsRepository } from '../../domain/repositories/deployments.repository';
import { createDeploymentUseCase } from '../create-deployment.use-case';
import { persistDeploymentUseCase } from '../persist-deployment.use-case';

import { ProviderResourceNotFoundError } from '@features/providers/domain/errors/provider-client.errors';
import { GitCommit } from '@features/providers/domain/models/git-commit.models';
import { ProviderCredentials } from '@features/providers/domain/models/provider.models';
import { ProviderClient } from '@features/providers/domain/ports/provider-client.port';
import { ProvidersRepository } from '@features/providers/domain/repositories/providers.repository';
import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { Service } from '@features/services/domain/models/service.models';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

jest.mock('../persist-deployment.use-case');

const mockPersistDeploymentUseCase = persistDeploymentUseCase as jest.MockedFunction<typeof persistDeploymentUseCase>;

describe('createDeploymentUseCase', () => {
    const triggerDto: TriggerDeploymentDto = {
        serviceId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    };

    const providerId = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f';

    const service: Service = {
        id: triggerDto.serviceId,
        name: 'My Service',
        description: '',
        projectId: 'a1b2c3d4-0000-0000-0000-000000000000',
        providerId,
        composeProject: 'gitpaas_web',
        repositoryId: '42',
        deploymentBranch: 'main',
        composerPath: 'docker-compose.yml',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const credentials: ProviderCredentials = {
        providerId,
        appId: '1234',
        installationId: '5678',
        privateKey: '-----BEGIN RSA PRIVATE KEY-----',
    };

    const commit: GitCommit = {
        sha: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
        message: 'Fix deployment healthcheck parsing\n\nMore details here',
    };

    const expectedCreateDto: CreateDeploymentDto = {
        serviceId: service.id,
        branch: 'main',
        commit: commit.sha,
        commitMessage: 'Fix deployment healthcheck parsing',
        composerPath: 'docker-compose.yml',
        triggeredBy: 'system',
    };

    const createdDeployment: Deployment = {
        id: '9c858901-8a57-4791-81fe-4c455b099bc9',
        serviceId: service.id,
        status: 'pending',
        branch: 'main',
        commit: commit.sha,
        commitMessage: 'Fix deployment healthcheck parsing',
        composerPath: 'docker-compose.yml',
        triggeredBy: 'system',
        error: null,
        createdAt: new Date('2026-07-11T00:00:00.000Z'),
        finishedAt: null,
    };

    const mockDeploymentsRepository = {} as unknown as DeploymentsRepository;
    let mockServicesRepository: jest.Mocked<Pick<ServicesRepository, 'findById'>>;
    let mockProvidersRepository: jest.Mocked<Pick<ProvidersRepository, 'getCredentials'>>;
    let mockProviderClient: jest.Mocked<Pick<ProviderClient, 'getCommit'>>;
    let mockQueue: jest.Mocked<Pick<DeploymentQueue, 'enqueue'>>;

    const run = (): Promise<Deployment> => {
        return createDeploymentUseCase(
            mockDeploymentsRepository,
            mockServicesRepository as unknown as ServicesRepository,
            mockProvidersRepository as unknown as ProvidersRepository,
            mockProviderClient as unknown as ProviderClient,
            mockQueue as unknown as DeploymentQueue,
            triggerDto,
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockServicesRepository = {
            findById: jest.fn(),
        };
        mockProvidersRepository = {
            getCredentials: jest.fn().mockResolvedValue(credentials),
        };
        mockProviderClient = {
            getCommit: jest.fn(),
        };
        mockQueue = {
            enqueue: jest.fn().mockResolvedValue(undefined),
        };
        mockPersistDeploymentUseCase.mockResolvedValue(createdDeployment);
    });

    it('throws ServiceNotFoundError when the service does not exist', async () => {
        mockServicesRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toThrow(ServiceNotFoundError);
        expect(mockPersistDeploymentUseCase).not.toHaveBeenCalled();
        expect(mockQueue.enqueue).not.toHaveBeenCalled();
    });

    it('throws ServiceNotDeployableError when the service has no repository or deployment branch', async () => {
        mockServicesRepository.findById.mockResolvedValue({ ...service, repositoryId: '', deploymentBranch: '' });

        await expect(run()).rejects.toThrow(ServiceNotDeployableError);
        expect(mockPersistDeploymentUseCase).not.toHaveBeenCalled();
        expect(mockQueue.enqueue).not.toHaveBeenCalled();
    });

    it('throws ServiceNotDeployableError when the service names no provider', async () => {
        mockServicesRepository.findById.mockResolvedValue({ ...service, providerId: null });

        await expect(run()).rejects.toThrow(ServiceNotDeployableError);
        expect(mockProvidersRepository.getCredentials).not.toHaveBeenCalled();
        expect(mockPersistDeploymentUseCase).not.toHaveBeenCalled();
        expect(mockQueue.enqueue).not.toHaveBeenCalled();
    });

    it('resolves the head commit for the service repository and branch', async () => {
        mockServicesRepository.findById.mockResolvedValue(service);
        mockProviderClient.getCommit.mockResolvedValue(commit);

        await run();

        expect(mockProviderClient.getCommit).toHaveBeenCalledWith(credentials, 42, 'main');
    });

    it('loads the credentials of the provider of the service', async () => {
        mockServicesRepository.findById.mockResolvedValue(service);
        mockProviderClient.getCommit.mockResolvedValue(commit);

        await run();

        expect(mockProvidersRepository.getCredentials).toHaveBeenCalledWith(service.providerId);
    });

    it('refuses the deployment when the provider cannot reach the stored repository', async () => {
        mockServicesRepository.findById.mockResolvedValue(service);
        mockProviderClient.getCommit.mockRejectedValue(new ProviderResourceNotFoundError());

        await expect(run()).rejects.toThrow(ProviderRepositoryUnreachableError);
        expect(mockPersistDeploymentUseCase).not.toHaveBeenCalled();
        expect(mockQueue.enqueue).not.toHaveBeenCalled();
    });

    it('names the provider and the repository in the refusal', async () => {
        mockServicesRepository.findById.mockResolvedValue(service);
        mockProviderClient.getCommit.mockRejectedValue(new ProviderResourceNotFoundError());

        await expect(run()).rejects.toThrow(`Provider ${service.providerId} cannot reach repository 42`);
    });

    it('surfaces any other failure of the provider unchanged', async () => {
        const failure = new Error('boom');

        mockServicesRepository.findById.mockResolvedValue(service);
        mockProviderClient.getCommit.mockRejectedValue(failure);

        await expect(run()).rejects.toBe(failure);
    });

    it('delegates persistence to persistDeploymentUseCase with the correctly-built DTO and returns its result', async () => {
        mockServicesRepository.findById.mockResolvedValue(service);
        mockProviderClient.getCommit.mockResolvedValue(commit);

        const result = await run();

        expect(mockPersistDeploymentUseCase).toHaveBeenCalledTimes(1);
        expect(mockPersistDeploymentUseCase).toHaveBeenCalledWith(mockDeploymentsRepository, expectedCreateDto);
        expect(result).toBe(createdDeployment);
    });

    it('publishes a run request on the queue after persisting the deployment', async () => {
        mockServicesRepository.findById.mockResolvedValue(service);
        mockProviderClient.getCommit.mockResolvedValue(commit);

        await run();

        expect(mockQueue.enqueue).toHaveBeenCalledTimes(1);
        expect(mockQueue.enqueue).toHaveBeenCalledWith({
            deploymentId: createdDeployment.id,
            serviceId: service.id,
            repositoryId: 42,
            commit: createdDeployment.commit,
            composerPath: 'docker-compose.yml',
            projectName: 'gitpaas_web',
        });
    });
});
