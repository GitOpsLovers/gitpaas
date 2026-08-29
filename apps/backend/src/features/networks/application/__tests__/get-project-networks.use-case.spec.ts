import { ProjectNetwork } from '../../domain/models/project-network.models';
import { ProjectNetworksRepository } from '../../domain/repositories/project-networks.repository';
import { getProjectNetworksUseCase } from '../get-project-networks.use-case';

import { RuntimeNetworkSummary } from '@core/domain/models/container-runtime.models';
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

describe('getProjectNetworksUseCase', () => {
    let mockNetworksRepository: jest.Mocked<Pick<ProjectNetworksRepository, 'listByProject'>>;
    let mockContainerRuntime: jest.Mocked<Pick<ContainerRuntime, 'listNetworks'>>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockNetworksRepository = { listByProject: jest.fn() };
        mockContainerRuntime = { listNetworks: jest.fn() };
    });

    /** Runs the use case with the mocked ports. */
    const run = () =>
        getProjectNetworksUseCase(
            mockNetworksRepository as unknown as ProjectNetworksRepository,
            mockContainerRuntime as unknown as ContainerRuntime,
            projectId,
        );

    it('reads the networks of that project alone', async () => {
        mockNetworksRepository.listByProject.mockResolvedValue([]);
        mockContainerRuntime.listNetworks.mockResolvedValue([]);

        await run();

        expect(mockNetworksRepository.listByProject).toHaveBeenCalledTimes(1);
        expect(mockNetworksRepository.listByProject).toHaveBeenCalledWith(projectId);
    });

    it('reads every network of the daemon, because the platform labels none of them', async () => {
        mockNetworksRepository.listByProject.mockResolvedValue([]);
        mockContainerRuntime.listNetworks.mockResolvedValue([]);

        await run();

        expect(mockContainerRuntime.listNetworks).toHaveBeenCalledWith({});
    });

    it('returns an empty list when the project holds no network', async () => {
        mockNetworksRepository.listByProject.mockResolvedValue([]);
        mockContainerRuntime.listNetworks.mockResolvedValue([]);

        expect(await run()).toEqual([]);
    });

    it('marks a stored network that the daemon holds as ready', async () => {
        mockNetworksRepository.listByProject.mockResolvedValue([network()]);
        mockContainerRuntime.listNetworks.mockResolvedValue([daemonNetwork()]);

        expect(await run()).toEqual([{ ...network(), state: 'ready' }]);
    });

    it('marks a stored network that the daemon lost as missing', async () => {
        mockNetworksRepository.listByProject.mockResolvedValue([network()]);
        mockContainerRuntime.listNetworks.mockResolvedValue([daemonNetwork({ name: 'bridge' })]);

        expect(await run()).toEqual([{ ...network(), state: 'missing' }]);
    });

    it('marks a network of the project that no row of the database holds as orphan', async () => {
        mockNetworksRepository.listByProject.mockResolvedValue([]);
        mockContainerRuntime.listNetworks.mockResolvedValue([daemonNetwork()]);

        expect(await run()).toEqual([
            {
                id: networkId, projectId, name: daemonName, daemonName, state: 'orphan',
            },
        ]);
    });

    it('never gives a network of a different project', async () => {
        const otherProjectId = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f';
        mockNetworksRepository.listByProject.mockResolvedValue([]);
        mockContainerRuntime.listNetworks.mockResolvedValue([
            daemonNetwork({ name: `gitpaas-${otherProjectId}-${networkId}` }),
        ]);

        expect(await run()).toEqual([]);
    });

    it('never gives a network of the daemon that carries no name of the platform', async () => {
        mockNetworksRepository.listByProject.mockResolvedValue([]);
        mockContainerRuntime.listNetworks.mockResolvedValue([
            daemonNetwork({ name: 'bridge' }),
            daemonNetwork({ name: 'gitpaas-proxy' }),
        ]);

        expect(await run()).toEqual([]);
    });

    it('gives the stored networks first, and the orphans after them', async () => {
        const orphanId = 'd4e5f6a7-b8c9-4d0e-9f1a-2b3c4d5e6f70';
        const orphanName = `gitpaas-${projectId}-${orphanId}`;
        mockNetworksRepository.listByProject.mockResolvedValue([network()]);
        mockContainerRuntime.listNetworks.mockResolvedValue([
            daemonNetwork({ name: orphanName }),
            daemonNetwork(),
        ]);

        expect(await run()).toEqual([
            { ...network(), state: 'ready' },
            {
                id: orphanId, projectId, name: orphanName, daemonName: orphanName, state: 'orphan',
            },
        ]);
    });

    it('propagates a failure of the daemon', async () => {
        const error = new Error('daemon unreachable');
        mockNetworksRepository.listByProject.mockResolvedValue([]);
        mockContainerRuntime.listNetworks.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
