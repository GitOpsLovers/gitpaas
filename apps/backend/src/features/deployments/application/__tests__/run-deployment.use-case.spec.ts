/* eslint-disable no-secrets/no-secrets */
import { DeploymentRunTask } from '../../domain/models/deployment-run-task.models';
import type { Deployment } from '../../domain/models/deployment.models';
import { DockerExecutor } from '../../domain/ports/docker-executor.port';
import { DeploymentsRepository } from '../../domain/repositories/deployments.repository';
import { runDeploymentUseCase } from '../run-deployment.use-case';

import type { SecretCipher } from '@core/domain/ports/secret-cipher.port';
import type { Domain } from '@features/domains/domain/models/domain.models';
import { ReverseProxy, RoutingLabels } from '@features/domains/domain/ports/reverse-proxy.port';
import { DomainsRepository } from '@features/domains/domain/repositories/domains.repository';
import { LogStore } from '@features/logs/domain/ports/log-store.port';
import type { ProjectNetwork } from '@features/networks/domain/models/project-network.models';
import { ServiceNetworksRepository } from '@features/networks/domain/repositories/service-networks.repository';
import { ProviderCredentials } from '@features/providers/domain/models/provider.models';
import { ProviderClient } from '@features/providers/domain/ports/provider-client.port';
import { ProvidersRepository } from '@features/providers/domain/repositories/providers.repository';
import type { StoredServiceVariable } from '@features/service-environment/domain/models/service-variable.models';
import { ServiceVariablesRepository } from '@features/service-environment/domain/repositories/service-variables.repository';
import { Service } from '@features/services/domain/models/service.models';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';
import { copyLegacyVolumesUseCase } from '@features/volumes/application/copy-legacy-volumes.use-case';
import { DaemonVolumesRepository } from '@features/volumes/domain/repositories/daemon-volumes.repository';
import { VolumesRepository } from '@features/volumes/domain/repositories/volumes.repository';

jest.mock('@features/volumes/application/copy-legacy-volumes.use-case');

const mockCopyLegacyVolumesUseCase = copyLegacyVolumesUseCase as jest.MockedFunction<typeof copyLegacyVolumesUseCase>;

describe('runDeploymentUseCase', () => {
    const payload: DeploymentRunTask = {
        deploymentId: '9c858901-8a57-4791-81fe-4c455b099bc9',
        serviceId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        repositoryId: 42,
        commit: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
        composerPath: 'docker-compose.yml',
        projectName: 'gitpaas',
    };

    const archive = Buffer.from('gzipped-repo-tarball');

    const service = {
        id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        name: 'My Service',
        description: '',
        projectId: 'a1b2c3d4-0000-0000-0000-000000000000',
        providerId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
        composeProject: 'gitpaas_web',
        repositoryId: '42',
        deploymentBranch: 'main',
        composerPath: 'docker-compose.yml',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
    } satisfies Service;

    const deployment = { id: payload.deploymentId, serviceId: service.id } as Deployment;

    /** The stack of the service, as the use case addresses it on the daemon. */
    const target = {
        serviceId: service.id,
        projectName: service.composeProject,
        networkAlias: 'my-service',
    };

    const credentials: ProviderCredentials = {
        providerId: service.providerId,
        appId: '1234',
        installationId: '5678',
        privateKey: '-----BEGIN RSA PRIVATE KEY-----',
    };

    /** Builds a domain of the deployed service, overriding only the fields under test. */
    const domain = (overrides: Partial<Domain> = {}): Domain => ({
        id: 'd0d0d0d0-0000-4000-8000-000000000001',
        serviceId: service.id,
        host: 'app.example.com',
        targetService: 'web',
        port: 8080,
        https: true,
        certificateState: 'pending',
        certificateError: null,
        ...overrides,
    });

    /** Builds a network of the project the service joined, overriding only the fields under test. */
    const projectNetwork = (overrides: Partial<ProjectNetwork> = {}): ProjectNetwork => ({
        id: 'n0n0n0n0-0000-4000-8000-000000000001',
        projectId: service.projectId,
        name: 'private',
        daemonName: `gitpaas-${service.projectId}-n0n0n0n0-0000-4000-8000-000000000001`,
        ...overrides,
    });

    let mockDeploymentsRepository: jest.Mocked<Pick<DeploymentsRepository, 'update' | 'findById'>>;
    let mockServicesRepository: jest.Mocked<Pick<ServicesRepository, 'findById'>>;
    let mockProvidersRepository: jest.Mocked<Pick<ProvidersRepository, 'getCredentials'>>;
    let mockProviderClient: jest.Mocked<Pick<ProviderClient, 'getRepositoryArchive'>>;
    let mockServiceVariablesRepository: jest.Mocked<Pick<ServiceVariablesRepository, 'getStoredByService'>>;
    let mockDomainsRepository: jest.Mocked<Pick<DomainsRepository, 'getByService'>>;
    let mockServiceNetworksRepository: jest.Mocked<Pick<ServiceNetworksRepository, 'listByService'>>;
    let mockVolumesRepository: jest.Mocked<Pick<VolumesRepository, 'listByService'>>;
    let mockDaemonVolumesRepository: jest.Mocked<Pick<DaemonVolumesRepository, 'findByName' | 'create' | 'copyData'>>;
    let mockDockerExecutor: jest.Mocked<Pick<DockerExecutor, 'up'>>;
    let mockReverseProxy: jest.Mocked<Pick<ReverseProxy, 'buildRouting'>>;
    let mockSecretCipher: jest.Mocked<SecretCipher>;
    let mockLogStore: jest.Mocked<Pick<LogStore, 'append' | 'complete'>>;

    const run = (): Promise<void> => {
        return runDeploymentUseCase(
            mockDeploymentsRepository as unknown as DeploymentsRepository,
            mockServicesRepository as unknown as ServicesRepository,
            mockProvidersRepository as unknown as ProvidersRepository,
            mockServiceVariablesRepository as unknown as ServiceVariablesRepository,
            mockDomainsRepository as unknown as DomainsRepository,
            mockServiceNetworksRepository as unknown as ServiceNetworksRepository,
            mockVolumesRepository as unknown as VolumesRepository,
            mockDaemonVolumesRepository as unknown as DaemonVolumesRepository,
            mockProviderClient as unknown as ProviderClient,
            mockDockerExecutor as unknown as DockerExecutor,
            mockReverseProxy as unknown as ReverseProxy,
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
        mockDomainsRepository = {
            getByService: jest.fn().mockResolvedValue([]),
        };
        mockServiceNetworksRepository = {
            listByService: jest.fn().mockResolvedValue([]),
        };
        mockVolumesRepository = {
            listByService: jest.fn().mockResolvedValue([]),
        };
        mockDaemonVolumesRepository = {
            findByName: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(undefined),
            copyData: jest.fn().mockResolvedValue(undefined),
        };
        mockCopyLegacyVolumesUseCase.mockResolvedValue(undefined);
        mockDockerExecutor = {
            up: jest.fn(),
        };
        mockReverseProxy = {
            buildRouting: jest.fn().mockReturnValue({}),
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

    it('brings the stack up with the archive, compose path, stack of the service and a log listener', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(undefined);

        await run();

        expect(mockDockerExecutor.up).toHaveBeenCalledWith(
            archive,
            payload.composerPath,
            target,
            {},
            {},
            [],
            expect.any(Function),
        );
    });

    it('gives the executor the labels the proxy builds from the domains of the service', async () => {
        const domains = [domain()];
        const routing: RoutingLabels = { web: { 'traefik.enable': 'true' } };

        mockDomainsRepository.getByService.mockResolvedValue(domains);
        mockReverseProxy.buildRouting.mockReturnValue(routing);
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(undefined);

        await run();

        expect(mockDomainsRepository.getByService).toHaveBeenCalledWith(service.id);
        expect(mockReverseProxy.buildRouting).toHaveBeenCalledWith(domains);
        expect(mockDockerExecutor.up).toHaveBeenCalledWith(
            archive,
            payload.composerPath,
            target,
            {},
            routing,
            [],
            expect.any(Function),
        );
    });

    it('names the stack of the service with its stored compose project, and never with a computed one', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(undefined);

        await run();

        const [, , stack] = mockDockerExecutor.up.mock.calls[0];

        expect(stack.projectName).toBe(service.composeProject);
        expect(stack.serviceId).toBe(service.id);
    });

    it('gives the containers the short slug of the service as their alias, because the compose project holds an underscore', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(undefined);

        await run();

        const [, , stack] = mockDockerExecutor.up.mock.calls[0];

        expect(stack.networkAlias).toBe('my-service');
        expect(stack.networkAlias).not.toContain('_');
        expect(stack.projectName).toContain('_');
    });

    it('gives the executor the daemon names of the networks of the project the service joined', async () => {
        const networks = [
            projectNetwork(),
            projectNetwork({ id: 'n0n0n0n0-0000-4000-8000-000000000002', name: 'cache', daemonName: 'gitpaas-p-2' }),
        ];

        mockServiceNetworksRepository.listByService.mockResolvedValue(networks);
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(undefined);

        await run();

        expect(mockServiceNetworksRepository.listByService).toHaveBeenCalledTimes(1);
        expect(mockServiceNetworksRepository.listByService).toHaveBeenCalledWith(service.id);
        expect(mockDockerExecutor.up).toHaveBeenCalledWith(
            archive,
            payload.composerPath,
            target,
            {},
            {},
            [networks[0].daemonName, 'gitpaas-p-2'],
            expect.any(Function),
        );
    });

    it('fails the run and starts no stack when the networks of the project cannot be read', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockServiceNetworksRepository.listByService.mockRejectedValue(new Error('networks unavailable'));

        await run();

        expect(mockDockerExecutor.up).not.toHaveBeenCalled();
        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, {
            status: 'failed',
            error: 'networks unavailable',
        });
    });

    it('brings the stack up with an empty routing when the service holds no domain', async () => {
        mockDomainsRepository.getByService.mockResolvedValue([]);
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(undefined);

        await run();

        expect(mockReverseProxy.buildRouting).toHaveBeenCalledWith([]);
        expect(mockDockerExecutor.up).toHaveBeenCalledWith(
            archive,
            payload.composerPath,
            target,
            {},
            {},
            [],
            expect.any(Function),
        );
    });

    it('fails the run and starts no stack when the domains of the service cannot be read', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDomainsRepository.getByService.mockRejectedValue(new Error('domains unavailable'));

        await run();

        expect(mockDockerExecutor.up).not.toHaveBeenCalled();
        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, {
            status: 'failed',
            error: 'domains unavailable',
        });
    });

    it('fans executor output out live through the log store', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockImplementation((_archive, _composePath, _project, _environment, _routing, _networks, onLog) => {
            onLog?.('building service');

            return Promise.resolve();
        });

        await run();

        expect(mockLogStore.append).toHaveBeenCalledWith(payload.deploymentId, 'building service');
    });

    it('absorbs a failing log append instead of leaving an unhandled rejection', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockLogStore.append.mockRejectedValue(new Error('log store unavailable'));
        mockDockerExecutor.up.mockImplementation((_archive, _composePath, _project, _environment, _routing, _networks, onLog) => {
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
        mockDockerExecutor.up.mockImplementation((_archive, _composePath, _project, _environment, _routing, _networks, onLog) => {
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
            target,
            { DATABASE_URL: 'postgres://db', API_TOKEN: 'the-token' },
            {},
            [],
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
            target,
            {},
            {},
            [],
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

    it('carries the data of the volumes of the service over before it brings the stack up', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(undefined);

        await run();

        expect(mockCopyLegacyVolumesUseCase).toHaveBeenCalledTimes(1);
        expect(mockCopyLegacyVolumesUseCase).toHaveBeenCalledWith(
            mockVolumesRepository,
            mockDaemonVolumesRepository,
            service,
            expect.any(Function),
        );
        expect(mockCopyLegacyVolumesUseCase.mock.invocationCallOrder[0])
            .toBeLessThan(mockDockerExecutor.up.mock.invocationCallOrder[0]);
    });

    it('writes the line of a copy of a volume into the log of the deployment', async () => {
        mockCopyLegacyVolumesUseCase.mockImplementation((_volumes, _daemonVolumes, _service, onLine) => {
            onLine('▹ Copied the data of the volume data from my-service_gitpaas-1 into gitpaas_web_gitpaas-1.');

            return Promise.resolve();
        });
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(undefined);

        await run();

        expect(mockLogStore.append).toHaveBeenCalledWith(
            payload.deploymentId,
            '▹ Copied the data of the volume data from my-service_gitpaas-1 into gitpaas_web_gitpaas-1.',
        );
    });

    it('fails the run and starts no stack when the copy of a volume throws', async () => {
        mockCopyLegacyVolumesUseCase.mockRejectedValue(new Error('the copy of the volume failed'));
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);

        await run();

        expect(mockDockerExecutor.up).not.toHaveBeenCalled();
        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, {
            status: 'failed',
            error: 'the copy of the volume failed',
        });
        expect(mockLogStore.complete).toHaveBeenCalledWith(payload.deploymentId, 'failed');
    });
});
