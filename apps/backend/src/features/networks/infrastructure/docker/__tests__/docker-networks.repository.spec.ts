import { Network } from '../../../domain/models/network.models';
import { DockerNetworksRepository } from '../docker-networks.repository';

import { GITPAAS_MANAGED_LABEL, GITPAAS_MANAGED_VALUE } from '@core/domain/constants/gitpaas-labels.constants';
import type { RuntimeContainerSummary, RuntimeNetworkSummary } from '@core/domain/models/container-runtime.models';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import { PROXY_NETWORK } from '@features/domains/infrastructure/traefik/traefik-reverse-proxy.constants';
import { Service } from '@features/services/domain/models/service.models';

/** GitPaaS ownership marker every listing is scoped to. */
const managedLabels = { [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE };

/**
 * Builds a runtime network summary, overriding only the fields under test.
 */
const networkSummary = (overrides: Partial<RuntimeNetworkSummary> = {}): RuntimeNetworkSummary => ({
    id: 'a1b2c3d4e5f6a1b2c3d4e5f6',
    name: 'my-service_default',
    driver: 'bridge',
    scope: 'local',
    internal: false,
    attachable: true,
    createdAt: new Date('2025-07-11T00:00:00.000Z'),
    ...overrides,
});

/**
 * Builds a runtime container summary, overriding only the fields under test.
 */
const containerSummary = (overrides: Partial<RuntimeContainerSummary> = {}): RuntimeContainerSummary => ({
    id: 'c1d2e3f4a5b6c1d2e3f4a5b6',
    names: ['/my-service-web-1'],
    image: 'nginx:latest',
    state: 'running',
    status: 'Up 2 hours',
    createdAt: new Date('2025-07-11T00:00:00.000Z'),
    projects: ['my-service'],
    ports: [],
    networks: ['my-service_default'],
    mounts: [],
    ...overrides,
});

describe('DockerNetworksRepository', () => {
    const service: Service = {
        id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        name: 'My Service!',
        description: '',
        projectId: 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60',
        providerId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
        composeProject: 'gitpaas_web',
        repositoryId: '42',
        deploymentBranch: 'main',
        composerPath: 'docker-compose.yml',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    let mockListNetworks: jest.Mock;
    let mockListContainers: jest.Mock;
    let mockContainerRuntime: jest.Mocked<Pick<DockerContainerRuntimeAdapter, 'listNetworks' | 'listContainers'>>;
    let sut: DockerNetworksRepository;

    beforeEach(() => {
        jest.clearAllMocks();

        mockListNetworks = jest.fn().mockResolvedValue([]);
        mockListContainers = jest.fn().mockResolvedValue([]);
        mockContainerRuntime = { listNetworks: mockListNetworks, listContainers: mockListContainers };
        sut = new DockerNetworksRepository(mockContainerRuntime as unknown as DockerContainerRuntimeAdapter);
    });

    describe('listByService', () => {
        it('lists networks scoped to the GitPaaS marker and the service project', async () => {
            await sut.listByService(service);

            expect(mockListNetworks).toHaveBeenCalledTimes(1);
            expect(mockListNetworks).toHaveBeenCalledWith({ labels: managedLabels, project: 'my-service' });
        });

        it('falls back to a service-<id> project when the name slugifies to empty', async () => {
            const unnamed: Service = { ...service, name: '!!!' };

            await sut.listByService(unnamed);

            expect(mockListNetworks).toHaveBeenCalledWith({ labels: managedLabels, project: `service-${unnamed.id}` });
        });

        it('maps a full network summary into the domain model', async () => {
            mockListNetworks.mockResolvedValue([networkSummary()]);

            const result = await sut.listByService(service);

            expect(result).toEqual<Network[]>([
                {
                    id: 'a1b2c3d4e5f6a1b2c3d4e5f6',
                    name: 'my-service_default',
                    driver: 'bridge',
                    scope: 'local',
                    internal: false,
                    attachable: true,
                    createdAt: new Date('2025-07-11T00:00:00.000Z'),
                },
            ]);
        });

        it('returns an empty array when the runtime reports no networks', async () => {
            mockListNetworks.mockResolvedValue([]);

            const result = await sut.listByService(service);

            expect(result).toEqual([]);
        });
    });

    describe('listConnectedByService', () => {
        it('lists the containers of the service, the stopped ones included', async () => {
            await sut.listConnectedByService(service);

            expect(mockListContainers).toHaveBeenCalledTimes(1);
            expect(mockListContainers).toHaveBeenCalledWith({ labels: managedLabels, project: 'my-service' }, true);
        });

        it('reads every network on the daemon to resolve the ones the containers hold', async () => {
            mockListContainers.mockResolvedValue([containerSummary()]);

            await sut.listConnectedByService(service);

            expect(mockListNetworks).toHaveBeenCalledTimes(1);
            expect(mockListNetworks).toHaveBeenCalledWith({});
        });

        it('maps the summary of each network a container holds into the domain model', async () => {
            mockListContainers.mockResolvedValue([containerSummary({ networks: ['gitpaas-project-net'] })]);
            mockListNetworks.mockResolvedValue([
                networkSummary({ id: 'b1', name: 'gitpaas-project-net', internal: true }),
                networkSummary({ id: 'b2', name: 'another-stack_default' }),
            ]);

            const result = await sut.listConnectedByService(service);

            expect(result).toEqual<Network[]>([
                {
                    id: 'b1',
                    name: 'gitpaas-project-net',
                    driver: 'bridge',
                    scope: 'local',
                    internal: true,
                    attachable: true,
                    createdAt: new Date('2025-07-11T00:00:00.000Z'),
                },
            ]);
        });

        it('gathers the networks of every container of the service without a repeat', async () => {
            mockListContainers.mockResolvedValue([
                containerSummary({ id: 'one', networks: ['my-service_default'] }),
                containerSummary({ id: 'two', networks: ['my-service_default', 'gitpaas-project-net'] }),
            ]);
            mockListNetworks.mockResolvedValue([
                networkSummary({ id: 'b1', name: 'my-service_default' }),
                networkSummary({ id: 'b2', name: 'gitpaas-project-net' }),
            ]);

            const result = await sut.listConnectedByService(service);

            expect(result.map((network) => network.name)).toEqual(['my-service_default', 'gitpaas-project-net']);
        });

        it('never gives the network of the reverse proxy', async () => {
            mockListContainers.mockResolvedValue([containerSummary({ networks: [PROXY_NETWORK] })]);
            mockListNetworks.mockResolvedValue([networkSummary({ name: PROXY_NETWORK })]);

            const result = await sut.listConnectedByService(service);

            expect(result).toEqual([]);
        });

        it('never reads the networks of the daemon when the containers hold none', async () => {
            mockListContainers.mockResolvedValue([containerSummary({ networks: [] })]);

            const result = await sut.listConnectedByService(service);

            expect(result).toEqual([]);
            expect(mockListNetworks).not.toHaveBeenCalled();
        });

        it('returns an empty array when the service runs no container', async () => {
            mockListContainers.mockResolvedValue([]);

            const result = await sut.listConnectedByService(service);

            expect(result).toEqual([]);
            expect(mockListNetworks).not.toHaveBeenCalled();
        });

        it('drops a network a container holds that the daemon no longer reports', async () => {
            mockListContainers.mockResolvedValue([containerSummary({ networks: ['vanished'] })]);
            mockListNetworks.mockResolvedValue([networkSummary({ name: 'my-service_default' })]);

            const result = await sut.listConnectedByService(service);

            expect(result).toEqual([]);
        });
    });

    describe('findByName', () => {
        it('reads every network of the daemon, with no selector', async () => {
            await sut.findByName('gitpaas-project-net');

            expect(mockListNetworks).toHaveBeenCalledTimes(1);
            expect(mockListNetworks).toHaveBeenCalledWith({});
        });

        it('returns the network the daemon carries under that name, in the domain shape', async () => {
            mockListNetworks.mockResolvedValue([
                networkSummary({ name: 'my-service_default' }),
                networkSummary({ id: 'b2c3d4', name: 'gitpaas-project-net', internal: true }),
            ]);

            const result = await sut.findByName('gitpaas-project-net');

            expect(result).toEqual<Network>({
                id: 'b2c3d4',
                name: 'gitpaas-project-net',
                driver: 'bridge',
                scope: 'local',
                internal: true,
                attachable: true,
                createdAt: new Date('2025-07-11T00:00:00.000Z'),
            });
        });

        it('returns null when the daemon holds no network under that name', async () => {
            mockListNetworks.mockResolvedValue([networkSummary({ name: 'my-service_default' })]);

            const result = await sut.findByName('gitpaas-project-net');

            expect(result).toBeNull();
        });

        it('returns null when the daemon holds no network at all', async () => {
            const result = await sut.findByName('gitpaas-project-net');

            expect(result).toBeNull();
        });

        it('matches the name exactly, and never a network whose name only holds it', async () => {
            mockListNetworks.mockResolvedValue([networkSummary({ name: 'gitpaas-project-net-2' })]);

            const result = await sut.findByName('gitpaas-project-net');

            expect(result).toBeNull();
        });

        it('propagates an error the daemon raises', async () => {
            const error = new Error('daemon unreachable');
            mockListNetworks.mockRejectedValue(error);

            await expect(sut.findByName('gitpaas-project-net')).rejects.toThrow(error);
        });
    });
});
