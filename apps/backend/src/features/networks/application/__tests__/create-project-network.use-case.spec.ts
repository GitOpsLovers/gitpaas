import type { CreateProjectNetworkDto } from '@gitpaas/contracts';

import { ProjectNetworkNameTakenError } from '../../domain/errors/project-network.errors';
import { ProjectNetwork } from '../../domain/models/project-network.models';
import { ProjectNetworksRepository } from '../../domain/repositories/project-networks.repository';
import { createProjectNetworkUseCase } from '../create-project-network.use-case';

import { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { ProjectNotFoundError } from '@features/projects/domain/errors/project.errors';
import { Project } from '@features/projects/domain/models/project.models';
import { ProjectsRepository } from '@features/projects/domain/repositories/projects.repository';

const projectId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

/** Builds a project fixture, overriding only the fields under test. */
const project = (overrides: Partial<Project> = {}): Project => ({
    id: projectId,
    name: 'gitpaas',
    namespaceId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
    ...overrides,
});

/** Builds a network of a project fixture, overriding only the fields under test. */
const network = (overrides: Partial<ProjectNetwork> = {}): ProjectNetwork => ({
    id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    projectId,
    name: 'private',
    daemonName: `gitpaas-${projectId}-b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e`,
    ...overrides,
});

const createDto: CreateProjectNetworkDto = { name: 'private' };

describe('createProjectNetworkUseCase', () => {
    let mockProjectsRepository: jest.Mocked<Pick<ProjectsRepository, 'findById'>>;
    let mockNetworksRepository: jest.Mocked<Pick<ProjectNetworksRepository, 'listByProject' | 'create'>>;
    let mockContainerRuntime: jest.Mocked<Pick<ContainerRuntime, 'createNetwork'>>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockProjectsRepository = { findById: jest.fn() };
        mockNetworksRepository = { listByProject: jest.fn(), create: jest.fn() };
        mockContainerRuntime = { createNetwork: jest.fn() };
    });

    /** Runs the use case with the mocked ports. */
    const run = (dto: CreateProjectNetworkDto = createDto) =>
        createProjectNetworkUseCase(
            mockProjectsRepository as unknown as ProjectsRepository,
            mockNetworksRepository as unknown as ProjectNetworksRepository,
            mockContainerRuntime as unknown as ContainerRuntime,
            projectId,
            dto,
        );

    /** Arranges a project that exists and that holds no network. */
    const arrangeEmptyProject = (): void => {
        mockProjectsRepository.findById.mockResolvedValue(project());
        mockNetworksRepository.listByProject.mockResolvedValue([]);
        mockNetworksRepository.create.mockImplementation((created) => Promise.resolve(created));
    };

    it('creates the network on the daemon as an internal bridge', async () => {
        arrangeEmptyProject();

        await run();

        expect(mockContainerRuntime.createNetwork).toHaveBeenCalledTimes(1);
        expect(mockContainerRuntime.createNetwork).toHaveBeenCalledWith({
            name: expect.stringContaining(`gitpaas-${projectId}-`),
            driver: 'bridge',
            internal: true,
        });
    });

    it('gives the network the name gitpaas-<projectId>-<networkId> on the daemon', async () => {
        arrangeEmptyProject();

        const created = await run();

        expect(created.daemonName).toBe(`gitpaas-${projectId}-${created.id}`);
        expect(mockContainerRuntime.createNetwork).toHaveBeenCalledWith(
            expect.objectContaining({ name: created.daemonName }),
        );
    });

    it('stores the network with the id, the project and the display name of the body', async () => {
        arrangeEmptyProject();

        const created = await run();

        expect(mockNetworksRepository.create).toHaveBeenCalledTimes(1);
        expect(mockNetworksRepository.create).toHaveBeenCalledWith({
            id: created.id,
            projectId,
            name: 'private',
            daemonName: created.daemonName,
        });
    });

    it('returns the stored network as ready, because the daemon holds it', async () => {
        mockProjectsRepository.findById.mockResolvedValue(project());
        mockNetworksRepository.listByProject.mockResolvedValue([]);
        mockNetworksRepository.create.mockResolvedValue(network());

        expect(await run()).toEqual({ ...network(), state: 'ready' });
    });

    it('gives a different id to each network of the same project', async () => {
        arrangeEmptyProject();

        const first = await run();
        const second = await run();

        expect(first.id).not.toBe(second.id);
    });

    it('throws when no project carries that id', async () => {
        mockProjectsRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ProjectNotFoundError);
    });

    it('never reaches the daemon when the project does not exist', async () => {
        mockProjectsRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ProjectNotFoundError);

        expect(mockContainerRuntime.createNetwork).not.toHaveBeenCalled();
        expect(mockNetworksRepository.create).not.toHaveBeenCalled();
    });

    it('throws when the project already holds a network of that name', async () => {
        mockProjectsRepository.findById.mockResolvedValue(project());
        mockNetworksRepository.listByProject.mockResolvedValue([network()]);

        await expect(run()).rejects.toBeInstanceOf(ProjectNetworkNameTakenError);
    });

    it('never creates a network on the daemon when the name is taken', async () => {
        mockProjectsRepository.findById.mockResolvedValue(project());
        mockNetworksRepository.listByProject.mockResolvedValue([network()]);

        await expect(run()).rejects.toBeInstanceOf(ProjectNetworkNameTakenError);

        expect(mockContainerRuntime.createNetwork).not.toHaveBeenCalled();
    });

    it('accepts a name that another network of the project does not hold', async () => {
        mockProjectsRepository.findById.mockResolvedValue(project());
        mockNetworksRepository.listByProject.mockResolvedValue([network({ name: 'other' })]);
        mockNetworksRepository.create.mockResolvedValue(network());

        await expect(run()).resolves.toEqual({ ...network(), state: 'ready' });
    });

    it('propagates a failure of the daemon, and never stores the network', async () => {
        const error = new Error('daemon unreachable');
        mockProjectsRepository.findById.mockResolvedValue(project());
        mockNetworksRepository.listByProject.mockResolvedValue([]);
        mockContainerRuntime.createNetwork.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);

        expect(mockNetworksRepository.create).not.toHaveBeenCalled();
    });
});
