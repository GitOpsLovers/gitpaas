import type { UpdateProjectNetworkDto } from '@gitpaas/contracts';

import {
    ProjectNetworkNameTakenError,
    ProjectNetworkNotFoundError,
} from '../../domain/errors/project-network.errors';
import { ProjectNetwork } from '../../domain/models/project-network.models';
import { ProjectNetworksRepository } from '../../domain/repositories/project-networks.repository';
import { renameProjectNetworkUseCase } from '../rename-project-network.use-case';

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

const updateDto: UpdateProjectNetworkDto = { name: 'backend' };

describe('renameProjectNetworkUseCase', () => {
    let mockNetworksRepository: jest.Mocked<
        Pick<ProjectNetworksRepository, 'findById' | 'listByProject' | 'rename'>
    >;
    let mockContainerRuntime: jest.Mocked<Pick<ContainerRuntime, 'listNetworks'>>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockNetworksRepository = { findById: jest.fn(), listByProject: jest.fn(), rename: jest.fn() };
        mockContainerRuntime = { listNetworks: jest.fn() };
    });

    /** Runs the use case with the mocked ports. */
    const run = (dto: UpdateProjectNetworkDto = updateDto) =>
        renameProjectNetworkUseCase(
            mockNetworksRepository as unknown as ProjectNetworksRepository,
            mockContainerRuntime as unknown as ContainerRuntime,
            projectId,
            networkId,
            dto,
        );

    it('renames the network of the database with the name of the body', async () => {
        mockNetworksRepository.findById.mockResolvedValue(network());
        mockNetworksRepository.listByProject.mockResolvedValue([network()]);
        mockNetworksRepository.rename.mockResolvedValue(network({ name: 'backend' }));
        mockContainerRuntime.listNetworks.mockResolvedValue([daemonNetwork()]);

        await run();

        expect(mockNetworksRepository.rename).toHaveBeenCalledTimes(1);
        expect(mockNetworksRepository.rename).toHaveBeenCalledWith(networkId, 'backend');
    });

    it('returns the renamed network as ready when the daemon holds it', async () => {
        mockNetworksRepository.findById.mockResolvedValue(network());
        mockNetworksRepository.listByProject.mockResolvedValue([network()]);
        mockNetworksRepository.rename.mockResolvedValue(network({ name: 'backend' }));
        mockContainerRuntime.listNetworks.mockResolvedValue([daemonNetwork()]);

        expect(await run()).toEqual({ ...network({ name: 'backend' }), state: 'ready' });
    });

    it('returns the renamed network as missing when the daemon lost it', async () => {
        mockNetworksRepository.findById.mockResolvedValue(network());
        mockNetworksRepository.listByProject.mockResolvedValue([network()]);
        mockNetworksRepository.rename.mockResolvedValue(network({ name: 'backend' }));
        mockContainerRuntime.listNetworks.mockResolvedValue([]);

        expect(await run()).toEqual({ ...network({ name: 'backend' }), state: 'missing' });
    });

    it('never changes the name of the network on the daemon', async () => {
        mockNetworksRepository.findById.mockResolvedValue(network());
        mockNetworksRepository.listByProject.mockResolvedValue([network()]);
        mockNetworksRepository.rename.mockResolvedValue(network({ name: 'backend' }));
        mockContainerRuntime.listNetworks.mockResolvedValue([daemonNetwork()]);

        expect((await run()).daemonName).toBe(daemonName);
    });

    it('throws when the project holds no network of that id', async () => {
        mockNetworksRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ProjectNetworkNotFoundError);
    });

    it('throws when the network belongs to a different project', async () => {
        mockNetworksRepository.findById.mockResolvedValue(
            network({ projectId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f' }),
        );

        await expect(run()).rejects.toBeInstanceOf(ProjectNetworkNotFoundError);

        expect(mockNetworksRepository.rename).not.toHaveBeenCalled();
    });

    it('throws when another network of the project already holds that name', async () => {
        mockNetworksRepository.findById.mockResolvedValue(network());
        mockNetworksRepository.listByProject.mockResolvedValue([
            network(),
            network({ id: 'd4e5f6a7-b8c9-4d0e-9f1a-2b3c4d5e6f70', name: 'backend' }),
        ]);

        await expect(run()).rejects.toBeInstanceOf(ProjectNetworkNameTakenError);

        expect(mockNetworksRepository.rename).not.toHaveBeenCalled();
    });

    it('accepts the name that the network already carries', async () => {
        mockNetworksRepository.findById.mockResolvedValue(network());
        mockNetworksRepository.listByProject.mockResolvedValue([network()]);
        mockNetworksRepository.rename.mockResolvedValue(network());
        mockContainerRuntime.listNetworks.mockResolvedValue([daemonNetwork()]);

        await expect(run({ name: 'private' })).resolves.toEqual({ ...network(), state: 'ready' });
    });

    it('throws when the row disappears between the read and the write', async () => {
        mockNetworksRepository.findById.mockResolvedValue(network());
        mockNetworksRepository.listByProject.mockResolvedValue([network()]);
        mockNetworksRepository.rename.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ProjectNetworkNotFoundError);
    });

    it('propagates an error of the repository', async () => {
        const error = new Error('db unreachable');
        mockNetworksRepository.findById.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
