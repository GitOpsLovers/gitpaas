import {
    ProjectNetworkInUseError,
    ProjectNetworkNotFoundError,
} from '../../domain/errors/project-network.errors';
import { ProjectNetwork } from '../../domain/models/project-network.models';
import { ProjectNetworksRepository } from '../../domain/repositories/project-networks.repository';
import { deleteProjectNetworkUseCase } from '../delete-project-network.use-case';

import {
    RuntimeContainerSummary,
    RuntimeNetworkSummary,
} from '@core/domain/models/container-runtime.models';
import { ContainerRuntime } from '@core/domain/ports/container-runtime.port';

const projectId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const networkId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
const daemonName = `gitpaas-${projectId}-${networkId}`;

/** Builds a network of a project fixture, overriding only the fields under test. */
const network = (overrides: Partial<ProjectNetwork> = {}): ProjectNetwork => ({
    id: networkId,
    projectId,
    name: 'private',
    daemonName,
    ...overrides,
});

/** Builds a summary of a network of the daemon, overriding only the fields under test. */
const daemonNetwork = (overrides: Partial<RuntimeNetworkSummary> = {}): RuntimeNetworkSummary => ({
    id: 'f1e2d3c4b5a6',
    name: daemonName,
    driver: 'bridge',
    scope: 'local',
    internal: true,
    attachable: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
});

/** Builds a summary of a container of the daemon, overriding only the fields under test. */
const container = (overrides: Partial<RuntimeContainerSummary> = {}): RuntimeContainerSummary => ({
    id: 'a9b8c7d6e5f4',
    names: ['/web'],
    image: 'nginx',
    state: 'running',
    status: 'Up 3 minutes',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    projects: ['gitpaas-web'],
    ports: [],
    networks: [],
    ...overrides,
});

describe('deleteProjectNetworkUseCase', () => {
    let mockNetworksRepository: jest.Mocked<Pick<ProjectNetworksRepository, 'findById' | 'delete'>>;
    let mockContainerRuntime: jest.Mocked<
        Pick<ContainerRuntime, 'listContainers' | 'listNetworks' | 'removeNetwork'>
    >;

    beforeEach(() => {
        jest.clearAllMocks();

        mockNetworksRepository = { findById: jest.fn(), delete: jest.fn() };
        mockContainerRuntime = { listContainers: jest.fn(), listNetworks: jest.fn(), removeNetwork: jest.fn() };
    });

    /** Runs the use case with the mocked ports. */
    const run = () =>
        deleteProjectNetworkUseCase(
            mockNetworksRepository as unknown as ProjectNetworksRepository,
            mockContainerRuntime as unknown as ContainerRuntime,
            projectId,
            networkId,
        );

    /** Arranges a network that the daemon holds and that no container joined. */
    const arrangeFreeNetwork = (): void => {
        mockNetworksRepository.findById.mockResolvedValue(network());
        mockContainerRuntime.listContainers.mockResolvedValue([container()]);
        mockContainerRuntime.listNetworks.mockResolvedValue([daemonNetwork()]);
        mockNetworksRepository.delete.mockResolvedValue(true);
    };

    it('reads the stopped containers too, because a stopped container still holds a network', async () => {
        arrangeFreeNetwork();

        await run();

        expect(mockContainerRuntime.listContainers).toHaveBeenCalledWith({}, true);
    });

    it('removes the network of the daemon and the row of the database', async () => {
        arrangeFreeNetwork();

        await expect(run()).resolves.toBeUndefined();

        expect(mockContainerRuntime.removeNetwork).toHaveBeenCalledTimes(1);
        expect(mockContainerRuntime.removeNetwork).toHaveBeenCalledWith(daemonName);
        expect(mockNetworksRepository.delete).toHaveBeenCalledWith(networkId);
    });

    it('removes the row alone when the daemon lost the network', async () => {
        mockNetworksRepository.findById.mockResolvedValue(network());
        mockContainerRuntime.listContainers.mockResolvedValue([]);
        mockContainerRuntime.listNetworks.mockResolvedValue([]);
        mockNetworksRepository.delete.mockResolvedValue(true);

        await expect(run()).resolves.toBeUndefined();

        expect(mockContainerRuntime.removeNetwork).not.toHaveBeenCalled();
        expect(mockNetworksRepository.delete).toHaveBeenCalledWith(networkId);
    });

    it('throws when a container still holds the network', async () => {
        mockNetworksRepository.findById.mockResolvedValue(network());
        mockContainerRuntime.listContainers.mockResolvedValue([container({ networks: [daemonName] })]);

        await expect(run()).rejects.toBeInstanceOf(ProjectNetworkInUseError);
    });

    it('never removes anything when a container still holds the network', async () => {
        mockNetworksRepository.findById.mockResolvedValue(network());
        mockContainerRuntime.listContainers.mockResolvedValue([container({ networks: [daemonName] })]);

        await expect(run()).rejects.toBeInstanceOf(ProjectNetworkInUseError);

        expect(mockContainerRuntime.removeNetwork).not.toHaveBeenCalled();
        expect(mockNetworksRepository.delete).not.toHaveBeenCalled();
    });

    it('never counts a container of a different network as a holder', async () => {
        mockNetworksRepository.findById.mockResolvedValue(network());
        mockContainerRuntime.listContainers.mockResolvedValue([container({ networks: ['gitpaas-proxy'] })]);
        mockContainerRuntime.listNetworks.mockResolvedValue([daemonNetwork()]);
        mockNetworksRepository.delete.mockResolvedValue(true);

        await expect(run()).resolves.toBeUndefined();
    });

    it('throws when the project holds no network of that id', async () => {
        mockNetworksRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ProjectNetworkNotFoundError);

        expect(mockContainerRuntime.listContainers).not.toHaveBeenCalled();
    });

    it('throws when the network belongs to a different project', async () => {
        mockNetworksRepository.findById.mockResolvedValue(
            network({ projectId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f' }),
        );

        await expect(run()).rejects.toBeInstanceOf(ProjectNetworkNotFoundError);
    });

    it('throws when the row disappears between the read and the write', async () => {
        mockNetworksRepository.findById.mockResolvedValue(network());
        mockContainerRuntime.listContainers.mockResolvedValue([]);
        mockContainerRuntime.listNetworks.mockResolvedValue([daemonNetwork()]);
        mockNetworksRepository.delete.mockResolvedValue(false);

        await expect(run()).rejects.toBeInstanceOf(ProjectNetworkNotFoundError);
    });

    it('propagates a failure of the daemon, and never removes the row', async () => {
        const error = new Error('daemon unreachable');
        mockNetworksRepository.findById.mockResolvedValue(network());
        mockContainerRuntime.listContainers.mockResolvedValue([]);
        mockContainerRuntime.listNetworks.mockResolvedValue([daemonNetwork()]);
        mockContainerRuntime.removeNetwork.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);

        expect(mockNetworksRepository.delete).not.toHaveBeenCalled();
    });
});
