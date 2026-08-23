/* eslint-disable no-secrets/no-secrets */
import { DeploymentRunTask } from '../../domain/models/deployment-run-task.models';
import type { Deployment } from '../../domain/models/deployment.models';
import { DockerExecutor } from '../../domain/ports/docker-executor.port';
import { DeploymentsRepository } from '../../domain/repositories/deployments.repository';
import { runDeploymentUseCase } from '../run-deployment.use-case';

import type { SecretCipher } from '@core/domain/ports/secret-cipher.port';
import { LogStore } from '@features/logs/domain/ports/log-store.port';
import { ProviderCredentials } from '@features/providers/domain/models/provider.models';
import { ProviderClient } from '@features/providers/domain/ports/provider-client.port';
import { ProvidersRepository } from '@features/providers/domain/repositories/providers.repository';
import type { StoredServiceVariable } from '@features/service-environment/domain/models/service-variable.models';
import { ServiceVariablesRepository } from '@features/service-environment/domain/repositories/service-variables.repository';
import { Service } from '@features/services/domain/models/service.models';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

describe('runDeploymentUseCase', () => {
    const payload: DeploymentRunTask = {
        deploymentId: '9c858901-8a57-4791-81fe-4c455b099bc9',
        repositoryId: 42,
        commit: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
        composerPath: 'docker-compose.yml',
        projectName: 'gitpaas',
    };

    const archive = Buffer.from('gzipped-repo-tarball');

    const service = {
        id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        name: 'My Service',
        projectId: 'a1b2c3d4-0000-0000-0000-000000000000',
        providerId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
        repositoryId: '42',
        deploymentBranch: 'main',
        composerPath: 'docker-compose.yml',
    } satisfies Service;

    const deployment = { id: payload.deploymentId, serviceId: service.id } as Deployment;

    const credentials: ProviderCredentials = {
        providerId: service.providerId,
        appId: '1234',
        installationId: '5678',
        privateKey: '-----BEGIN RSA PRIVATE KEY-----',
    };

    let mockDeploymentsRepository: jest.Mocked<Pick<DeploymentsRepository, 'update' | 'findById'>>;
    let mockServicesRepository: jest.Mocked<Pick<ServicesRepository, 'findById'>>;
    let mockProvidersRepository: jest.Mocked<Pick<ProvidersRepository, 'getCredentials'>>;
    let mockProviderClient: jest.Mocked<Pick<ProviderClient, 'getRepositoryArchive'>>;
    let mockServiceVariablesRepository: jest.Mocked<Pick<ServiceVariablesRepository, 'getStoredByService'>>;
    let mockDockerExecutor: jest.Mocked<Pick<DockerExecutor, 'up'>>;
    let mockSecretCipher: jest.Mocked<SecretCipher>;
    let mockLogStore: jest.Mocked<Pick<LogStore, 'append' | 'complete'>>;

    const run = (): Promise<void> => {
        return runDeploymentUseCase(
            mockDeploymentsRepository as unknown as DeploymentsRepository,
            mockServicesRepository as unknown as ServicesRepository,
            mockProvidersRepository as unknown as ProvidersRepository,
            mockServiceVariablesRepository as unknown as ServiceVariablesRepository,
            mockProviderClient as unknown as ProviderClient,
            mockDockerExecutor,
            mockLogStore as unknown as LogStore,
            mockSecretCipher,
            payload,
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockDeploymentsRepository = {
            update: jest.fn(),
            findById: jest.fn().mockResolvedValue(deployment),
        };
        mockServicesRepository = {
            findById: jest.fn().mockResolvedValue(service),
        };
        mockProvidersRepository = {
            getCredentials: jest.fn().mockResolvedValue(credentials),
        };
        mockProviderClient = {
            getRepositoryArchive: jest.fn(),
        };
        mockServiceVariablesRepository = {
            getStoredByService: jest.fn().mockResolvedValue([]),
        };
        mockDockerExecutor = {
            up: jest.fn(),
        };
        mockSecretCipher = {
            encryptSecret: jest.fn(),
            decryptSecret: jest.fn().mockReturnValue('opened'),
        };
        mockLogStore = {
            append: jest.fn().mockResolvedValue(undefined),
            complete: jest.fn().mockResolvedValue(undefined),
        };
    });

    it('marks the deployment as running before doing any work', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(undefined);

        await run();

        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(1, payload.deploymentId, { status: 'running' });
    });

    it('downloads the repository archive for the payload repository and commit', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(undefined);

        await run();

        expect(mockProviderClient.getRepositoryArchive).toHaveBeenCalledWith(credentials, payload.repositoryId, payload.commit);
    });

    it('loads the credentials of the provider of the deployed service', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(undefined);

        await run();

        expect(mockProvidersRepository.getCredentials).toHaveBeenCalledWith(service.providerId);
    });

    it('fails the run with a message that names the provider when the provider went away', async () => {
        mockProvidersRepository.getCredentials.mockResolvedValue(null);

        await run();

        expect(mockProviderClient.getRepositoryArchive).not.toHaveBeenCalled();
        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, {
            status: 'failed',
            error: `Provider ${service.providerId} not found`,
        });
        expect(mockLogStore.complete).toHaveBeenCalledWith(payload.deploymentId, 'failed');
    });

    it('fails the run when the service names no provider', async () => {
        mockServicesRepository.findById.mockResolvedValue({ ...service, providerId: null });

        await run();

        expect(mockProvidersRepository.getCredentials).not.toHaveBeenCalled();
        expect(mockProviderClient.getRepositoryArchive).not.toHaveBeenCalled();
        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, {
            status: 'failed',
            error: 'Service has no provider, repository or deployment branch configured',
        });
        expect(mockLogStore.complete).toHaveBeenCalledWith(payload.deploymentId, 'failed');
    });

    it('brings the stack up with the archive, compose path, project name and a log listener', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(undefined);

        await run();

        expect(mockDockerExecutor.up).toHaveBeenCalledWith(archive, payload.composerPath, payload.projectName, {}, expect.any(Function));
    });

    it('fans executor output out live through the log store', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockImplementation((_archive, _composePath, _project, _environment, onLog) => {
            onLog?.('building service');

            return Promise.resolve();
        });

        await run();

        expect(mockLogStore.append).toHaveBeenCalledWith(payload.deploymentId, 'building service');
    });

    it('absorbs a failing log append instead of leaving an unhandled rejection', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockLogStore.append.mockRejectedValue(new Error('log store unavailable'));
        mockDockerExecutor.up.mockImplementation((_archive, _composePath, _project, _environment, onLog) => {
            onLog?.('building service');

            return Promise.resolve();
        });

        await expect(run()).resolves.toBeUndefined();

        // The run still succeeds: a dropped line must not fail the deployment.
        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'success' });
        expect(mockLogStore.complete).toHaveBeenCalledWith(payload.deploymentId, 'success');
    });

    it('marks the deployment successful and completes the log when the stack comes up', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockImplementation((_archive, _composePath, _project, _environment, onLog) => {
            onLog?.('building service');
            onLog?.('stack up');

            return Promise.resolve();
        });

        await run();

        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'success' });
        expect(mockLogStore.complete).toHaveBeenCalledWith(payload.deploymentId, 'success');
    });

    it('marks the deployment failed, streams the failure line and completes when the executor throws', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockRejectedValue(new Error('build failed'));

        await run();

        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'failed', error: 'build failed' });
        expect(mockLogStore.append).toHaveBeenCalledWith(payload.deploymentId, '✖ Deployment failed: build failed');
        expect(mockLogStore.complete).toHaveBeenCalledWith(payload.deploymentId, 'failed');
    });

    it('gives the variables of the service to the executor, with the secrets among them opened', async () => {
        const variables: StoredServiceVariable[] = [
            { name: 'DATABASE_URL', secret: false, storedValue: 'postgres://db' },
            { name: 'API_TOKEN', secret: true, storedValue: 'sealed-payload' },
        ];

        mockServiceVariablesRepository.getStoredByService.mockResolvedValue(variables);
        mockSecretCipher.decryptSecret.mockReturnValue('the-token');
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(undefined);

        await run();

        expect(mockServiceVariablesRepository.getStoredByService).toHaveBeenCalledWith(service.id);
        expect(mockSecretCipher.decryptSecret).toHaveBeenCalledWith('sealed-payload');
        expect(mockDockerExecutor.up).toHaveBeenCalledWith(
            archive,
            payload.composerPath,
            payload.projectName,
            { DATABASE_URL: 'postgres://db', API_TOKEN: 'the-token' },
            expect.any(Function),
        );
    });

    it('brings the stack up with an empty environment when the service holds no variable', async () => {
        mockServiceVariablesRepository.getStoredByService.mockResolvedValue([]);
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(undefined);

        await run();

        expect(mockSecretCipher.decryptSecret).not.toHaveBeenCalled();
        expect(mockDockerExecutor.up).toHaveBeenCalledWith(
            archive,
            payload.composerPath,
            payload.projectName,
            {},
            expect.any(Function),
        );
    });

    it('fails the run with a message that names the variable when a secret cannot be decrypted, and starts no stack', async () => {
        mockServiceVariablesRepository.getStoredByService.mockResolvedValue([
            { name: 'API_TOKEN', secret: true, storedValue: 'sealed-payload' },
        ]);
        mockSecretCipher.decryptSecret.mockImplementation(() => {
            throw new Error('Unsupported state or unable to authenticate data');
        });
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);

        await run();

        expect(mockDockerExecutor.up).not.toHaveBeenCalled();
        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, {
            status: 'failed',
            error: 'The secret API_TOKEN cannot be decrypted',
        });
        expect(mockLogStore.append).toHaveBeenCalledWith(payload.deploymentId, '✖ Deployment failed: The secret API_TOKEN cannot be decrypted');
        expect(mockLogStore.complete).toHaveBeenCalledWith(payload.deploymentId, 'failed');
    });

    it('never writes the value of a secret to the log store', async () => {
        mockServiceVariablesRepository.getStoredByService.mockResolvedValue([
            { name: 'API_TOKEN', secret: true, storedValue: 'sealed-payload' },
        ]);
        mockSecretCipher.decryptSecret.mockReturnValue('the-token');
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(undefined);

        await run();

        const written = mockLogStore.append.mock.calls.map(([, line]) => line).join('\n');

        expect(written).not.toContain('the-token');
        expect(written).not.toContain('sealed-payload');
    });

    it('marks the deployment as failed when downloading the archive throws', async () => {
        mockProviderClient.getRepositoryArchive.mockRejectedValue(new Error('archive not found'));

        await run();

        expect(mockDockerExecutor.up).not.toHaveBeenCalled();
        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'failed', error: 'archive not found' });
    });

    it('stringifies non-Error failures', async () => {
        mockProviderClient.getRepositoryArchive.mockRejectedValue('boom');

        await run();

        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'failed', error: 'boom' });
    });
});
