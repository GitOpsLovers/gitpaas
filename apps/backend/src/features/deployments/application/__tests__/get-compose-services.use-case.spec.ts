/* eslint-disable no-secrets/no-secrets */
import { ServiceNotDeployableError } from '../../domain/errors/deployment.errors';
import type { Deployment } from '../../domain/models/deployment.models';
import { DockerExecutor } from '../../domain/ports/docker-executor.port';
import { DeploymentsRepository } from '../../domain/repositories/deployments.repository';
import { getComposeServicesUseCase } from '../get-compose-services.use-case';

import { ProviderNotFoundError } from '@features/providers/domain/errors/provider.errors';
import { ProviderCredentials } from '@features/providers/domain/models/provider.models';
import { ProviderClient } from '@features/providers/domain/ports/provider-client.port';
import { ProvidersRepository } from '@features/providers/domain/repositories/providers.repository';
import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { Service } from '@features/services/domain/models/service.models';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

describe('getComposeServicesUseCase', () => {
    const serviceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

    const archive = Buffer.from('gzipped-repo-tarball');

    const service: Service = {
        id: serviceId,
        name: 'My Service',
        description: '',
        projectId: 'a1b2c3d4-0000-0000-0000-000000000000',
        providerId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
        repositoryId: '42',
        deploymentBranch: 'main',
        composerPath: 'docker-compose.yml',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const credentials: ProviderCredentials = {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        providerId: service.providerId!,
        appId: '1234',
        installationId: '5678',
        privateKey: '-----BEGIN RSA PRIVATE KEY-----',
    };

    /** Builds a deployment of the service, overriding only the fields under test. */
    const deployment = (overrides: Partial<Deployment> = {}): Deployment => ({
        id: 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b',
        serviceId,
        status: 'success',
        branch: 'main',
        commit: 'abc123',
        commitMessage: 'feat: something',
        composerPath: 'deploy/docker-compose.yml',
        triggeredBy: 'marc',
        error: null,
        createdAt: new Date('2026-07-11T00:00:00.000Z'),
        finishedAt: new Date('2026-07-11T00:01:00.000Z'),
        ...overrides,
    });

    let mockDeploymentsRepository: jest.Mocked<Pick<DeploymentsRepository, 'getAllByService'>>;
    let mockServicesRepository: jest.Mocked<Pick<ServicesRepository, 'findById'>>;
    let mockProvidersRepository: jest.Mocked<Pick<ProvidersRepository, 'getCredentials'>>;
    let mockProviderClient: jest.Mocked<Pick<ProviderClient, 'getRepositoryArchive'>>;
    let mockDockerExecutor: jest.Mocked<Pick<DockerExecutor, 'listComposeServices'>>;

    const run = (): Promise<string[]> => {
        return getComposeServicesUseCase(
            mockDeploymentsRepository as unknown as DeploymentsRepository,
            mockServicesRepository as unknown as ServicesRepository,
            mockProvidersRepository as unknown as ProvidersRepository,
            mockProviderClient as unknown as ProviderClient,
            mockDockerExecutor as unknown as DockerExecutor,
            serviceId,
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockDeploymentsRepository = {
            getAllByService: jest.fn().mockResolvedValue([deployment()]),
        };
        mockServicesRepository = {
            findById: jest.fn().mockResolvedValue(service),
        };
        mockProvidersRepository = {
            getCredentials: jest.fn().mockResolvedValue(credentials),
        };
        mockProviderClient = {
            getRepositoryArchive: jest.fn().mockResolvedValue(archive),
        };
        mockDockerExecutor = {
            listComposeServices: jest.fn().mockResolvedValue(['web', 'cache']),
        };
    });

    it('reads the recipe of the most recent deployment and returns its compose services', async () => {
        const result = await run();

        expect(mockProviderClient.getRepositoryArchive).toHaveBeenCalledWith(credentials, 42, 'abc123');
        expect(mockDockerExecutor.listComposeServices).toHaveBeenCalledWith(archive, 'deploy/docker-compose.yml');
        expect(result).toEqual(['web', 'cache']);
    });

    it('takes the first deployment the repository answers, which is the most recent one', async () => {
        mockDeploymentsRepository.getAllByService.mockResolvedValue([
            deployment({ commit: 'newest', composerPath: 'newest.yml' }),
            deployment({ commit: 'older', composerPath: 'older.yml' }),
        ]);

        await run();

        expect(mockProviderClient.getRepositoryArchive).toHaveBeenCalledWith(credentials, 42, 'newest');
        expect(mockDockerExecutor.listComposeServices).toHaveBeenCalledWith(archive, 'newest.yml');
    });

    it('falls back to the branch of the deployment when it carries no commit', async () => {
        mockDeploymentsRepository.getAllByService.mockResolvedValue([deployment({ commit: null })]);

        await run();

        expect(mockProviderClient.getRepositoryArchive).toHaveBeenCalledWith(credentials, 42, 'main');
    });

    it('returns an empty list and downloads nothing when the service was never deployed', async () => {
        mockDeploymentsRepository.getAllByService.mockResolvedValue([]);

        await expect(run()).resolves.toEqual([]);

        expect(mockProvidersRepository.getCredentials).not.toHaveBeenCalled();
        expect(mockProviderClient.getRepositoryArchive).not.toHaveBeenCalled();
        expect(mockDockerExecutor.listComposeServices).not.toHaveBeenCalled();
    });

    it('throws when the service does not exist', async () => {
        mockServicesRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ServiceNotFoundError);
        expect(mockDeploymentsRepository.getAllByService).not.toHaveBeenCalled();
    });

    it('throws when the service names no provider', async () => {
        mockServicesRepository.findById.mockResolvedValue({ ...service, providerId: null });

        await expect(run()).rejects.toBeInstanceOf(ServiceNotDeployableError);
        expect(mockProviderClient.getRepositoryArchive).not.toHaveBeenCalled();
    });

    it('throws when the provider of the service went away', async () => {
        mockProvidersRepository.getCredentials.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ProviderNotFoundError);
    });

    it('propagates a failure of the download of the archive', async () => {
        const error = new Error('archive not found');
        mockProviderClient.getRepositoryArchive.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
