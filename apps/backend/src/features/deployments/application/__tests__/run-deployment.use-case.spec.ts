/* eslint-disable no-secrets/no-secrets */
import { DeploymentRunTask } from '../../domain/models/deployment-run-task.models';
import type { Deployment } from '../../domain/models/deployment.models';
import { DockerExecutor } from '../../domain/ports/docker-executor.port';
import { DeploymentsRepository } from '../../domain/repositories/deployments.repository';
import { SECRET_MASK } from '../mask-secret-values.use-case';
import { DEPLOYMENT_FAILURE_REASON, RUN_DEPLOYMENT_LOG_CONTEXT, runDeploymentUseCase } from '../run-deployment.use-case';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import type { SecretCipher } from '@core/domain/ports/secret-cipher.port';
import { reconcileComposeDomainsUseCase } from '@features/domains/application/reconcile-compose-domains.use-case';
import { DomainTakenError } from '@features/domains/domain/errors/domain.errors';
import type { Domain } from '@features/domains/domain/models/domain.models';
import { ReverseProxy, RoutingLabels } from '@features/domains/domain/ports/reverse-proxy.port';
import { DomainsRepository } from '@features/domains/domain/repositories/domains.repository';
import { LogStore } from '@features/logs/domain/ports/log-store.port';
import { ProviderCredentials } from '@features/providers/domain/models/provider.models';
import { ProviderClient } from '@features/providers/domain/ports/provider-client.port';
import { ProvidersRepository } from '@features/providers/domain/repositories/providers.repository';
import type { StoredServiceVariable } from '@features/service-environment/domain/models/service-variable.models';
import { ServiceVariablesRepository } from '@features/service-environment/domain/repositories/service-variables.repository';
import { Service } from '@features/services/domain/models/service.models';
import { RepositoryComposeFile } from '@features/services/domain/ports/repository-compose-file.port';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';
import { reconcileComposeVolumesUseCase } from '@features/volumes/application/reconcile-compose-volumes.use-case';
import { ServiceVolumesRepository } from '@features/volumes/domain/repositories/service-volumes.repository';
import { VolumesRepository } from '@features/volumes/domain/repositories/volumes.repository';

jest.mock('@features/volumes/application/reconcile-compose-volumes.use-case');
jest.mock('@features/domains/application/reconcile-compose-domains.use-case');

const mockReconcileComposeVolumesUseCase = reconcileComposeVolumesUseCase as jest.MockedFunction<
    typeof reconcileComposeVolumesUseCase
>;
const mockReconcileComposeDomainsUseCase = reconcileComposeDomainsUseCase as jest.MockedFunction<
    typeof reconcileComposeDomainsUseCase
>;

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
    };

    /** Compose file of the repository of the deployment, which declares one domain on its service `web`. */
    const composeText = [
        'services:',
        '  web:',
        '    image: nginx',
        '    volumes:',
        '      - data:/var/lib/app',
        '    x-gitpaas-domain:',
        '      host: app.example.com',
        '      port: 8080',
        '      https: true',
        'volumes:',
        '  data:',
        '',
    ].join('\n');

    /** Final Compose text the executor answers with, which the successful run stores on the deployment. */
    const finalCompose = 'services:\n  web:\n    image: nginx\n';

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
        origin: 'user',
        ...overrides,
    });

    let mockDeploymentsRepository: jest.Mocked<Pick<DeploymentsRepository, 'update' | 'findById'>>;
    let mockServicesRepository: jest.Mocked<Pick<ServicesRepository, 'findById' | 'saveComposeDomains'>>;
    let mockProvidersRepository: jest.Mocked<Pick<ProvidersRepository, 'getCredentials'>>;
    let mockProviderClient: jest.Mocked<Pick<ProviderClient, 'getRepositoryArchive'>>;
    let mockRepositoryComposeFile: jest.Mocked<Pick<RepositoryComposeFile, 'read'>>;
    let mockServiceVariablesRepository: jest.Mocked<Pick<ServiceVariablesRepository, 'getStoredByService'>>;
    let mockDomainsRepository: jest.Mocked<Pick<DomainsRepository, 'getByService'>>;
    let mockVolumesRepository: jest.Mocked<Pick<VolumesRepository, 'listByService'>>;
    let mockServiceVolumesRepository: jest.Mocked<Pick<ServiceVolumesRepository, 'listByService'>>;
    let mockDockerExecutor: jest.Mocked<Pick<DockerExecutor, 'up'>>;
    let mockReverseProxy: jest.Mocked<Pick<ReverseProxy, 'buildRouting'>>;
    let mockSecretCipher: jest.Mocked<SecretCipher>;
    let mockLogStore: jest.Mocked<Pick<LogStore, 'append' | 'complete'>>;
    let mockLogger: jest.Mocked<Pick<AppLogger, 'error'>>;

    const run = (): Promise<void> => {
        return runDeploymentUseCase(
            mockDeploymentsRepository as unknown as DeploymentsRepository,
            mockServicesRepository as unknown as ServicesRepository,
            mockProvidersRepository as unknown as ProvidersRepository,
            mockServiceVariablesRepository as unknown as ServiceVariablesRepository,
            mockDomainsRepository as unknown as DomainsRepository,
            mockVolumesRepository as unknown as VolumesRepository,
            mockServiceVolumesRepository as unknown as ServiceVolumesRepository,
            mockProviderClient as unknown as ProviderClient,
            mockRepositoryComposeFile,
            mockDockerExecutor as unknown as DockerExecutor,
            mockReverseProxy as unknown as ReverseProxy,
            mockLogStore as unknown as LogStore,
            mockSecretCipher,
            mockLogger as unknown as AppLogger,
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
            saveComposeDomains: jest.fn().mockResolvedValue(undefined),
        };
        mockProvidersRepository = {
            getCredentials: jest.fn().mockResolvedValue(credentials),
        };
        mockProviderClient = {
            getRepositoryArchive: jest.fn(),
        };
        mockRepositoryComposeFile = {
            read: jest.fn().mockResolvedValue(composeText),
        };
        mockServiceVariablesRepository = {
            getStoredByService: jest.fn().mockResolvedValue([]),
        };
        mockDomainsRepository = {
            getByService: jest.fn().mockResolvedValue([]),
        };
        mockVolumesRepository = {
            listByService: jest.fn().mockResolvedValue([]),
        };
        mockServiceVolumesRepository = {
            listByService: jest.fn().mockResolvedValue([]),
        };
        mockReconcileComposeVolumesUseCase.mockResolvedValue(undefined);
        mockReconcileComposeDomainsUseCase.mockResolvedValue(undefined);
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
        mockLogger = {
            error: jest.fn(),
        };
    });

    it('marks the deployment as running before doing any work', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(finalCompose);

        await run();

        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(1, payload.deploymentId, { status: 'running' });
    });

    it('downloads the repository archive for the payload repository and commit', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(finalCompose);

        await run();

        expect(mockProviderClient.getRepositoryArchive).toHaveBeenCalledWith(credentials, payload.repositoryId, payload.commit);
    });

    it('loads the credentials of the provider of the deployed service', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(finalCompose);

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
        mockDockerExecutor.up.mockResolvedValue(finalCompose);

        await run();

        expect(mockDockerExecutor.up).toHaveBeenCalledWith(
            archive,
            payload.composerPath,
            target,
            {},
            {},
            expect.any(Function),
        );
    });

    it('gives the executor the labels the proxy builds from the domains of the service', async () => {
        const domains = [domain()];
        const routing: RoutingLabels = { web: { 'traefik.enable': 'true' } };

        mockDomainsRepository.getByService.mockResolvedValue(domains);
        mockReverseProxy.buildRouting.mockReturnValue(routing);
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(finalCompose);

        await run();

        expect(mockDomainsRepository.getByService).toHaveBeenCalledWith(service.id);
        expect(mockReverseProxy.buildRouting).toHaveBeenCalledWith(domains);
        expect(mockDockerExecutor.up).toHaveBeenCalledWith(
            archive,
            payload.composerPath,
            target,
            {},
            routing,
            expect.any(Function),
        );
    });

    it('reconciles the domains the compose file declares before it reads the domains of the service', async () => {
        const order: string[] = [];
        // eslint-disable-next-line @typescript-eslint/require-await
        mockReconcileComposeDomainsUseCase.mockImplementation(async () => { order.push('reconcile'); });
        // eslint-disable-next-line @typescript-eslint/require-await
        mockDomainsRepository.getByService.mockImplementation(async () => { order.push('read'); return []; });
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(finalCompose);

        await run();

        expect(mockReconcileComposeDomainsUseCase).toHaveBeenCalledTimes(1);
        expect(mockReconcileComposeDomainsUseCase).toHaveBeenCalledWith(
            mockDomainsRepository,
            mockServicesRepository,
            service.id,
        );
        expect(order).toEqual(['reconcile', 'read']);
    });

    it('caches the domains the compose file of the run declares before it reconciles them', async () => {
        const order: string[] = [];
        // eslint-disable-next-line @typescript-eslint/require-await
        mockServicesRepository.saveComposeDomains.mockImplementation(async () => { order.push('cache'); });
        // eslint-disable-next-line @typescript-eslint/require-await
        mockReconcileComposeDomainsUseCase.mockImplementation(async () => { order.push('reconcile'); });
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(finalCompose);

        await run();

        expect(mockServicesRepository.saveComposeDomains).toHaveBeenCalledTimes(1);
        expect(mockServicesRepository.saveComposeDomains).toHaveBeenCalledWith(service.id, {
            domains: [{
                targetService: 'web', host: 'app.example.com', port: 8080, https: true,
            }],
            refreshedAt: expect.any(Date),
        });
        expect(order).toEqual(['cache', 'reconcile']);
    });

    it('reads the compose file out of the archive the run already holds, and never downloads it again', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(finalCompose);

        await run();

        expect(mockRepositoryComposeFile.read).toHaveBeenCalledTimes(1);
        expect(mockRepositoryComposeFile.read).toHaveBeenCalledWith(archive, payload.composerPath);
        expect(mockProviderClient.getRepositoryArchive).toHaveBeenCalledTimes(1);
    });

    it('leaves the cache untouched, and still reconciles, when the archive carries no compose file', async () => {
        mockRepositoryComposeFile.read.mockResolvedValue(null);
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(finalCompose);

        await run();

        expect(mockServicesRepository.saveComposeDomains).not.toHaveBeenCalled();
        expect(mockReconcileComposeDomainsUseCase).toHaveBeenCalledTimes(1);
    });

    it('never fails a deployment, and leaves the cache untouched, when the compose file is no valid YAML', async () => {
        mockRepositoryComposeFile.read.mockResolvedValue('services: [web');
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(finalCompose);

        await run();

        expect(mockServicesRepository.saveComposeDomains).not.toHaveBeenCalled();
        expect(mockLogStore.append).toHaveBeenCalledWith(payload.deploymentId, '▹ The domains of the Compose file could not be read.');
        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, {
            status: 'success',
            finalCompose,
        });
    });

    it('fails the run with the reason of the reconciliation, and starts no stack, when a declared host is taken', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockReconcileComposeDomainsUseCase.mockRejectedValue(new DomainTakenError('app.example.com'));

        await run();

        expect(mockDomainsRepository.getByService).not.toHaveBeenCalled();
        expect(mockDockerExecutor.up).not.toHaveBeenCalled();
        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, {
            status: 'failed',
            error: 'Domain app.example.com is already claimed',
        });
    });

    it('names the stack of the service with its stored compose project, and never with a computed one', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(finalCompose);

        await run();

        const [, , stack] = mockDockerExecutor.up.mock.calls[0];

        expect(stack.projectName).toBe(service.composeProject);
        expect(stack.serviceId).toBe(service.id);
    });

    it('brings the stack up with an empty routing when the service holds no domain', async () => {
        mockDomainsRepository.getByService.mockResolvedValue([]);
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(finalCompose);

        await run();

        expect(mockReverseProxy.buildRouting).toHaveBeenCalledWith([]);
        expect(mockDockerExecutor.up).toHaveBeenCalledWith(
            archive,
            payload.composerPath,
            target,
            {},
            {},
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
            error: DEPLOYMENT_FAILURE_REASON,
        });
    });

    it('fans executor output out live through the log store', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockImplementation((_archive, _composePath, _project, _environment, _routing, onLog) => {
            onLog?.('building service');

            return Promise.resolve(finalCompose);
        });

        await run();

        expect(mockLogStore.append).toHaveBeenCalledWith(payload.deploymentId, 'building service');
    });

    it('absorbs a failing log append instead of leaving an unhandled rejection', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockLogStore.append.mockRejectedValue(new Error('log store unavailable'));
        mockDockerExecutor.up.mockImplementation((_archive, _composePath, _project, _environment, _routing, onLog) => {
            onLog?.('building service');

            return Promise.resolve(finalCompose);
        });

        await expect(run()).resolves.toBeUndefined();

        // The run still succeeds: a dropped line must not fail the deployment.
        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'success', finalCompose });
        expect(mockLogStore.complete).toHaveBeenCalledWith(payload.deploymentId, 'success');
    });

    it('marks the deployment successful and completes the log when the stack comes up', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockImplementation((_archive, _composePath, _project, _environment, _routing, onLog) => {
            onLog?.('building service');
            onLog?.('stack up');

            return Promise.resolve(finalCompose);
        });

        await run();

        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'success', finalCompose });
        expect(mockLogStore.complete).toHaveBeenCalledWith(payload.deploymentId, 'success');
    });

    it('marks the deployment failed with the generic reason, streams it and completes when the executor throws', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockRejectedValue(new Error('build failed: /srv/gitpaas/spool/deploy-42'));

        await run();

        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, {
            status: 'failed',
            error: DEPLOYMENT_FAILURE_REASON,
        });
        expect(mockLogStore.append).toHaveBeenCalledWith(payload.deploymentId, `✖ Deployment failed: ${DEPLOYMENT_FAILURE_REASON}`);
        expect(mockLogStore.complete).toHaveBeenCalledWith(payload.deploymentId, 'failed');
    });

    it('never lets the detail of a failure of the executor reach the deployment or its log', async () => {
        const failure = new Error('build failed: /srv/gitpaas/spool/deploy-42');

        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockRejectedValue(failure);

        await run();

        const stored = mockDeploymentsRepository.update.mock.calls.map(([, changes]) => JSON.stringify(changes)).join('\n');
        const written = mockLogStore.append.mock.calls.map(([, line]) => line).join('\n');

        expect(stored).not.toContain('/srv/gitpaas/spool/deploy-42');
        expect(written).not.toContain('/srv/gitpaas/spool/deploy-42');
    });

    it('writes the detail of the failure to the log of the server alone', async () => {
        const failure = new Error('build failed: /srv/gitpaas/spool/deploy-42');

        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockRejectedValue(failure);

        await run();

        expect(mockLogger.error).toHaveBeenCalledWith(
            `Deployment ${payload.deploymentId} failed: build failed: /srv/gitpaas/spool/deploy-42`,
            failure,
            RUN_DEPLOYMENT_LOG_CONTEXT,
        );
    });

    it('never logs the detail of a run that succeeds', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(finalCompose);

        await run();

        expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('gives the variables of the service to the executor, with the secrets among them opened', async () => {
        const variables: StoredServiceVariable[] = [
            { name: 'DATABASE_URL', secret: false, storedValue: 'postgres://db' },
            { name: 'API_TOKEN', secret: true, storedValue: 'sealed-payload' },
        ];

        mockServiceVariablesRepository.getStoredByService.mockResolvedValue(variables);
        mockSecretCipher.decryptSecret.mockReturnValue('the-token');
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(finalCompose);

        await run();

        expect(mockServiceVariablesRepository.getStoredByService).toHaveBeenCalledWith(service.id);
        expect(mockSecretCipher.decryptSecret).toHaveBeenCalledWith('sealed-payload', service.id);
        expect(mockDockerExecutor.up).toHaveBeenCalledWith(
            archive,
            payload.composerPath,
            target,
            { DATABASE_URL: 'postgres://db', API_TOKEN: 'the-token' },
            {},
            expect.any(Function),
        );
    });

    it('brings the stack up with an empty environment when the service holds no variable', async () => {
        mockServiceVariablesRepository.getStoredByService.mockResolvedValue([]);
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(finalCompose);

        await run();

        expect(mockSecretCipher.decryptSecret).not.toHaveBeenCalled();
        expect(mockDockerExecutor.up).toHaveBeenCalledWith(
            archive,
            payload.composerPath,
            target,
            {},
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
        mockDockerExecutor.up.mockResolvedValue(finalCompose);

        await run();

        const written = mockLogStore.append.mock.calls.map(([, line]) => line).join('\n');

        expect(written).not.toContain('the-token');
        expect(written).not.toContain('sealed-payload');
    });

    it('masks the value of a secret the executor echoes in a line of the log', async () => {
        mockServiceVariablesRepository.getStoredByService.mockResolvedValue([
            { name: 'API_TOKEN', secret: true, storedValue: 'sealed-payload' },
        ]);
        mockSecretCipher.decryptSecret.mockReturnValue('the-token');
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockImplementation((_archive, _composePath, _project, _environment, _routing, onLog) => {
            onLog?.('env: API_TOKEN=the-token');

            return Promise.resolve(finalCompose);
        });

        await run();

        expect(mockLogStore.append).toHaveBeenCalledWith(payload.deploymentId, `env: API_TOKEN=${SECRET_MASK}`);
    });

    it('masks the value of a secret the final Compose text carries outside the block of the environment', async () => {
        mockServiceVariablesRepository.getStoredByService.mockResolvedValue([
            { name: 'API_TOKEN', secret: true, storedValue: 'sealed-payload' },
        ]);
        mockSecretCipher.decryptSecret.mockReturnValue('the-token');
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue('services:\n  web:\n    command: publish --token the-token\n');

        await run();

        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, {
            status: 'success',
            finalCompose: `services:\n  web:\n    command: publish --token ${SECRET_MASK}\n`,
        });
    });

    it('keeps the value of a variable that is no secret in the final Compose text', async () => {
        mockServiceVariablesRepository.getStoredByService.mockResolvedValue([
            { name: 'DATABASE_URL', secret: false, storedValue: 'postgres://db' },
        ]);
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue('services:\n  web:\n    command: connect postgres://db\n');

        await run();

        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, {
            status: 'success',
            finalCompose: 'services:\n  web:\n    command: connect postgres://db\n',
        });
    });

    it('keeps the value of a variable that is no secret in a line of the log', async () => {
        mockServiceVariablesRepository.getStoredByService.mockResolvedValue([
            { name: 'DATABASE_URL', secret: false, storedValue: 'postgres://db' },
        ]);
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockImplementation((_archive, _composePath, _project, _environment, _routing, onLog) => {
            onLog?.('connected to postgres://db');

            return Promise.resolve(finalCompose);
        });

        await run();

        expect(mockLogStore.append).toHaveBeenCalledWith(payload.deploymentId, 'connected to postgres://db');
    });

    it('marks the deployment as failed when downloading the archive throws', async () => {
        mockProviderClient.getRepositoryArchive.mockRejectedValue(new Error('archive not found'));

        await run();

        expect(mockDockerExecutor.up).not.toHaveBeenCalled();
        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, {
            status: 'failed',
            error: DEPLOYMENT_FAILURE_REASON,
        });
    });

    it('stores the generic reason for a non-Error failure, and stringifies its detail for the server', async () => {
        mockProviderClient.getRepositoryArchive.mockRejectedValue('boom');

        await run();

        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, {
            status: 'failed',
            error: DEPLOYMENT_FAILURE_REASON,
        });
        expect(mockLogger.error).toHaveBeenCalledWith(
            `Deployment ${payload.deploymentId} failed: boom`,
            'boom',
            RUN_DEPLOYMENT_LOG_CONTEXT,
        );
    });

    it('reconciles the volumes the compose file declares once the stack is up', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(finalCompose);

        await run();

        expect(mockReconcileComposeVolumesUseCase).toHaveBeenCalledTimes(1);
        expect(mockReconcileComposeVolumesUseCase).toHaveBeenCalledWith(
            mockVolumesRepository,
            mockServiceVolumesRepository,
            service.id,
            [{ daemonKey: 'data', mount: { composeServiceName: 'web', containerPath: '/var/lib/app', readOnly: false } }],
        );
        expect(mockReconcileComposeVolumesUseCase.mock.invocationCallOrder[0])
            .toBeGreaterThan(mockDockerExecutor.up.mock.invocationCallOrder[0]);
    });

    it('reconciles no volume when the stack never came up', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockRejectedValue(new Error('compose failed'));

        await run();

        expect(mockReconcileComposeVolumesUseCase).not.toHaveBeenCalled();
    });

    it('reconciles no volume when the archive carries no compose file', async () => {
        mockRepositoryComposeFile.read.mockResolvedValue(null);
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(finalCompose);

        await run();

        expect(mockReconcileComposeVolumesUseCase).not.toHaveBeenCalled();
    });

    it('keeps the deployment successful when the reconciliation of the volumes of Compose fails', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(finalCompose);
        mockReconcileComposeVolumesUseCase.mockRejectedValue(new Error('database down'));

        await run();

        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'success', finalCompose });
        expect(mockLogStore.append).toHaveBeenCalledWith(
            payload.deploymentId,
            '▹ The volumes of the Compose file could not be reconciled.',
        );
    });

    it('reads the compose file one time alone, and both caches of the run share that text', async () => {
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(finalCompose);

        await run();

        expect(mockRepositoryComposeFile.read).toHaveBeenCalledTimes(1);
        expect(mockServicesRepository.saveComposeDomains).toHaveBeenCalledTimes(1);
        expect(mockReconcileComposeVolumesUseCase).toHaveBeenCalledTimes(1);
    });

    it('keeps the deployment successful, and caches nothing, when the read of the compose file fails', async () => {
        mockRepositoryComposeFile.read.mockRejectedValue(new Error('no such entry'));
        mockProviderClient.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(finalCompose);

        await run();

        expect(mockServicesRepository.saveComposeDomains).not.toHaveBeenCalled();
        expect(mockReconcileComposeVolumesUseCase).not.toHaveBeenCalled();
        expect(mockLogStore.append).toHaveBeenCalledWith(payload.deploymentId, '▹ The Compose file could not be read.');
        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'success', finalCompose });
    });
});
