/* eslint-disable no-secrets/no-secrets */
import { ServiceNotFoundError } from '../../domain/errors/service.errors';
import { FinalCompose } from '../../domain/models/final-compose.models';
import { Service } from '../../domain/models/service.models';
import { RepositoryComposeFile } from '../../domain/ports/repository-compose-file.port';
import { ServicesRepository } from '../../domain/repositories/services.repository';
import { getFinalComposeUseCase } from '../get-final-compose.use-case';

import { UnsafeComposeRecipeError } from '@core/domain/errors/compose.errors';
import type { Deployment } from '@features/deployments/domain/models/deployment.models';
import { DeploymentsRepository } from '@features/deployments/domain/repositories/deployments.repository';
import { ProviderNotFoundError } from '@features/providers/domain/errors/provider.errors';
import { ProviderCredentials } from '@features/providers/domain/models/provider.models';
import { ProviderClient } from '@features/providers/domain/ports/provider-client.port';
import { ProvidersRepository } from '@features/providers/domain/repositories/providers.repository';

describe('getFinalComposeUseCase', () => {
    const serviceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

    const archive = Buffer.from('gzipped-repo-tarball');

    const repositoryText = 'services:\n  web:\n    image: nginx\n';

    const deployedText = 'services:\n  web:\n    image: registry/web:abc123\n';

    const service: Service = {
        id: serviceId,
        name: 'My Service',
        description: '',
        projectId: 'a1b2c3d4-0000-0000-0000-000000000000',
        providerId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
        composeProject: 'gitpaas_web',
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
        composerPath: 'docker-compose.yml',
        triggeredBy: 'marc',
        error: null,
        finalCompose: deployedText,
        createdAt: new Date('2026-07-11T00:00:00.000Z'),
        finishedAt: new Date('2026-07-11T00:01:00.000Z'),
        ...overrides,
    });

    let mockServicesRepository: jest.Mocked<Pick<ServicesRepository, 'findById'>>;
    let mockDeploymentsRepository: jest.Mocked<Pick<DeploymentsRepository, 'getAllByService'>>;
    let mockProvidersRepository: jest.Mocked<Pick<ProvidersRepository, 'getCredentials'>>;
    let mockProviderClient: jest.Mocked<Pick<ProviderClient, 'getRepositoryArchive'>>;
    let mockRepositoryComposeFile: jest.Mocked<Pick<RepositoryComposeFile, 'read'>>;

    const run = (): Promise<FinalCompose> => {
        return getFinalComposeUseCase(
            mockServicesRepository as unknown as ServicesRepository,
            mockDeploymentsRepository as unknown as DeploymentsRepository,
            mockProvidersRepository as unknown as ProvidersRepository,
            mockProviderClient as unknown as ProviderClient,
            mockRepositoryComposeFile,
            serviceId,
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockServicesRepository = {
            findById: jest.fn().mockResolvedValue(service),
        };
        mockDeploymentsRepository = {
            getAllByService: jest.fn().mockResolvedValue([deployment()]),
        };
        mockProvidersRepository = {
            getCredentials: jest.fn().mockResolvedValue(credentials),
        };
        mockProviderClient = {
            getRepositoryArchive: jest.fn().mockResolvedValue(archive),
        };
        mockRepositoryComposeFile = {
            read: jest.fn().mockResolvedValue(repositoryText),
        };
    });

    describe('when a deployment saved its final Compose text', () => {
        it('answers the text of the deployment, and marks it as the text of a deployment', async () => {
            await expect(run()).resolves.toEqual({ text: deployedText, origin: 'deployment' });
        });

        it('never downloads the repository', async () => {
            await run();

            expect(mockProvidersRepository.getCredentials).not.toHaveBeenCalled();
            expect(mockProviderClient.getRepositoryArchive).not.toHaveBeenCalled();
            expect(mockRepositoryComposeFile.read).not.toHaveBeenCalled();
        });

        it('takes the most recent deployment, which the repository answers first', async () => {
            mockDeploymentsRepository.getAllByService.mockResolvedValue([
                deployment({ finalCompose: 'newest' }),
                deployment({ finalCompose: 'older' }),
            ]);

            await expect(run()).resolves.toEqual({ text: 'newest', origin: 'deployment' });
        });

        it('skips a deployment of before the feature, which saved no text', async () => {
            mockDeploymentsRepository.getAllByService.mockResolvedValue([
                deployment({ finalCompose: null }),
                deployment({ finalCompose: deployedText }),
            ]);

            await expect(run()).resolves.toEqual({ text: deployedText, origin: 'deployment' });
        });
    });

    describe('when the service holds no deployment and holds a provider', () => {
        beforeEach(() => {
            mockDeploymentsRepository.getAllByService.mockResolvedValue([]);
        });

        it('answers the Compose file of the repository, and marks it as the file of the repository', async () => {
            await expect(run()).resolves.toEqual({ text: repositoryText, origin: 'repository' });
        });

        it('downloads the branch of the deployment of the service, and reads its Compose file', async () => {
            await run();

            expect(mockProvidersRepository.getCredentials).toHaveBeenCalledWith(service.providerId);
            expect(mockProviderClient.getRepositoryArchive).toHaveBeenCalledTimes(1);
            expect(mockProviderClient.getRepositoryArchive).toHaveBeenCalledWith(credentials, 42, 'main');
            expect(mockRepositoryComposeFile.read).toHaveBeenCalledWith(archive, 'docker-compose.yml');
        });

        it('answers an empty result when the repository carries no Compose file at that path', async () => {
            mockRepositoryComposeFile.read.mockResolvedValue(null);

            await expect(run()).resolves.toEqual({ text: null, origin: 'none' });
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

    describe('when the service holds no deployment and no provider', () => {
        beforeEach(() => {
            mockDeploymentsRepository.getAllByService.mockResolvedValue([]);
            mockServicesRepository.findById.mockResolvedValue({ ...service, providerId: null });
        });

        it('answers an empty result', async () => {
            await expect(run()).resolves.toEqual({ text: null, origin: 'none' });
        });

        it('reaches no provider and downloads nothing', async () => {
            await run();

            expect(mockProvidersRepository.getCredentials).not.toHaveBeenCalled();
            expect(mockProviderClient.getRepositoryArchive).not.toHaveBeenCalled();
            expect(mockRepositoryComposeFile.read).not.toHaveBeenCalled();
        });
    });

    describe('when the stored path of the compose file escapes the repository', () => {
        beforeEach(() => {
            mockDeploymentsRepository.getAllByService.mockResolvedValue([]);
        });

        it('throws, and never reads the archive', async () => {
            mockServicesRepository.findById.mockResolvedValue({ ...service, composerPath: '../../etc/compose.yml' });

            await expect(run()).rejects.toBeInstanceOf(UnsafeComposeRecipeError);
            expect(mockRepositoryComposeFile.read).not.toHaveBeenCalled();
        });

        it('reads the archive when the path is empty, because the service carries no compose file yet', async () => {
            mockServicesRepository.findById.mockResolvedValue({ ...service, composerPath: '' });
            mockRepositoryComposeFile.read.mockResolvedValue(null);

            await expect(run()).resolves.toEqual({ text: null, origin: 'none' });
            expect(mockRepositoryComposeFile.read).toHaveBeenCalledWith(archive, '');
        });
    });

    it('throws when the service does not exist', async () => {
        mockServicesRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ServiceNotFoundError);
        expect(mockDeploymentsRepository.getAllByService).not.toHaveBeenCalled();
    });
});
