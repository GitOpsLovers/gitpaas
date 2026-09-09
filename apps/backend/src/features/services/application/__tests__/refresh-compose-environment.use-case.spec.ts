/* eslint-disable no-secrets/no-secrets */
import { ServiceNotFoundError } from '../../domain/errors/service.errors';
import { ComposeEnvironmentCache } from '../../domain/models/compose-environment.models';
import { Service } from '../../domain/models/service.models';
import { RepositoryComposeFile } from '../../domain/ports/repository-compose-file.port';
import { ServicesRepository } from '../../domain/repositories/services.repository';
import { refreshComposeEnvironmentUseCase } from '../refresh-compose-environment.use-case';

import { UnsafeComposeRecipeError } from '@core/domain/errors/compose.errors';
import { ProviderNotFoundError } from '@features/providers/domain/errors/provider.errors';
import { ProviderCredentials } from '@features/providers/domain/models/provider.models';
import { ProviderClient } from '@features/providers/domain/ports/provider-client.port';
import { ProvidersRepository } from '@features/providers/domain/repositories/providers.repository';

describe('refreshComposeEnvironmentUseCase', () => {
    const serviceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

    const archive = Buffer.from('gzipped-repo-tarball');

    const composeText = 'services:\n  web:\n    environment:\n      LOG_LEVEL: debug\n      SECRET: ${SECRET}\n';

    const refreshedAt = new Date('2026-09-08T10:00:00.000Z');

    const service: Service = {
        id: serviceId,
        name: 'My Service',
        description: '',
        projectId: 'a1b2c3d4-0000-0000-0000-000000000000',
        composeProject: 'gitpaas_web',
        providerId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
        repositoryId: '42',
        deploymentBranch: 'main',
        composerPath: 'docker-compose.yml',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const credentials: ProviderCredentials = {
        providerId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
        appId: '1234',
        installationId: '5678',
        privateKey: '-----BEGIN RSA PRIVATE KEY-----',
    };

    let mockServicesRepository: jest.Mocked<Pick<ServicesRepository, 'findById' | 'saveComposeEnvironment'>>;
    let mockProvidersRepository: jest.Mocked<Pick<ProvidersRepository, 'getCredentials'>>;
    let mockProviderClient: jest.Mocked<Pick<ProviderClient, 'getRepositoryArchive'>>;
    let mockRepositoryComposeFile: jest.Mocked<Pick<RepositoryComposeFile, 'read'>>;

    /** Runs the use case with the mocked collaborators. */
    const run = (): Promise<ComposeEnvironmentCache | null> => {
        return refreshComposeEnvironmentUseCase(
            mockServicesRepository as unknown as ServicesRepository,
            mockProvidersRepository as unknown as ProvidersRepository,
            mockProviderClient as unknown as ProviderClient,
            mockRepositoryComposeFile,
            serviceId,
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers().setSystemTime(refreshedAt);

        mockServicesRepository = {
            findById: jest.fn().mockResolvedValue(service),
            saveComposeEnvironment: jest.fn().mockResolvedValue(undefined),
        };
        mockProvidersRepository = {
            getCredentials: jest.fn().mockResolvedValue(credentials),
        };
        mockProviderClient = {
            getRepositoryArchive: jest.fn().mockResolvedValue(archive),
        };
        mockRepositoryComposeFile = {
            read: jest.fn().mockResolvedValue(composeText),
        };
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('downloads the branch of the deployment of the service, and reads its compose file', async () => {
        await run();

        expect(mockProvidersRepository.getCredentials).toHaveBeenCalledWith(service.providerId);
        expect(mockProviderClient.getRepositoryArchive).toHaveBeenCalledTimes(1);
        expect(mockProviderClient.getRepositoryArchive).toHaveBeenCalledWith(credentials, 42, 'main');
        expect(mockRepositoryComposeFile.read).toHaveBeenCalledWith(archive, 'docker-compose.yml');
    });

    it('caches the names, the values and the moment of the read', async () => {
        await run();

        expect(mockServicesRepository.saveComposeEnvironment).toHaveBeenCalledTimes(1);
        expect(mockServicesRepository.saveComposeEnvironment).toHaveBeenCalledWith(serviceId, {
            variables: { LOG_LEVEL: 'debug', SECRET: '' },
            refreshedAt,
        });
    });

    it('returns the cache it wrote', async () => {
        await expect(run()).resolves.toEqual({ variables: { LOG_LEVEL: 'debug', SECRET: '' }, refreshedAt });
    });

    it('leaves the cache untouched when the service holds no provider', async () => {
        mockServicesRepository.findById.mockResolvedValue({ ...service, providerId: null });

        await expect(run()).resolves.toBeNull();
        expect(mockProviderClient.getRepositoryArchive).not.toHaveBeenCalled();
        expect(mockServicesRepository.saveComposeEnvironment).not.toHaveBeenCalled();
    });

    it('leaves the cache untouched when the service names no compose file', async () => {
        mockServicesRepository.findById.mockResolvedValue({ ...service, composerPath: '' });

        await expect(run()).resolves.toBeNull();
        expect(mockProviderClient.getRepositoryArchive).not.toHaveBeenCalled();
        expect(mockServicesRepository.saveComposeEnvironment).not.toHaveBeenCalled();
    });

    it('leaves the cache untouched when the repository carries no compose file at that path', async () => {
        mockRepositoryComposeFile.read.mockResolvedValue(null);

        await expect(run()).resolves.toBeNull();
        expect(mockServicesRepository.saveComposeEnvironment).not.toHaveBeenCalled();
    });

    it('leaves the cache untouched when the download of the archive fails', async () => {
        const error = new Error('archive not found');
        mockProviderClient.getRepositoryArchive.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
        expect(mockServicesRepository.saveComposeEnvironment).not.toHaveBeenCalled();
    });

    it('leaves the cache untouched when the text is no valid YAML', async () => {
        mockRepositoryComposeFile.read.mockResolvedValue('services:\n  web:\n   - broken\n     nope: [');

        await expect(run()).rejects.toThrow();
        expect(mockServicesRepository.saveComposeEnvironment).not.toHaveBeenCalled();
    });

    it('throws when the stored path of the compose file escapes the repository, and downloads nothing', async () => {
        mockServicesRepository.findById.mockResolvedValue({ ...service, composerPath: '../../etc/compose.yml' });

        await expect(run()).rejects.toBeInstanceOf(UnsafeComposeRecipeError);
        expect(mockProviderClient.getRepositoryArchive).not.toHaveBeenCalled();
        expect(mockServicesRepository.saveComposeEnvironment).not.toHaveBeenCalled();
    });

    it('throws when the provider of the service went away', async () => {
        mockProvidersRepository.getCredentials.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ProviderNotFoundError);
        expect(mockServicesRepository.saveComposeEnvironment).not.toHaveBeenCalled();
    });

    it('throws when the service does not exist', async () => {
        mockServicesRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ServiceNotFoundError);
        expect(mockProvidersRepository.getCredentials).not.toHaveBeenCalled();
    });
});
