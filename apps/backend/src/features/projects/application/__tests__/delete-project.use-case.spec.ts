import { ProjectNotFoundError } from '../../domain/errors/project.errors';
import { Project } from '../../domain/models/project.models';
import { ProjectsRepository } from '../../domain/repositories/projects.repository';
import { deleteProjectUseCase } from '../delete-project.use-case';

import { RuntimeNetworkSummary } from '@core/domain/models/container-runtime.models';
import { ContainerRuntime } from '@core/domain/ports/container-runtime.port';

describe('deleteProjectUseCase', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';
    const namespaceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
    const otherNamespaceId = '0a9d7ef7-8b6c-4f42-a1c2-9de3e33a95a1';

    const project: Project = { id, name: 'GitPaaS', namespaceId };

    let mockProjectsRepository: jest.Mocked<Pick<ProjectsRepository, 'findById' | 'delete'>>;
    let mockContainerRuntime: jest.Mocked<Pick<ContainerRuntime, 'listNetworks' | 'removeNetwork'>>;

    /** Builds a summary of a network of the daemon, overriding only the fields under test. */
    const networkSummary = (overrides: Partial<RuntimeNetworkSummary> = {}): RuntimeNetworkSummary => ({
        id: 'b6b3e9a4-3c0e-4d02-9f1b-72d3a4f5c6d7',
        name: 'bridge',
        driver: 'bridge',
        scope: 'local',
        internal: false,
        attachable: false,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        ...overrides,
    });

    /** Runs the use case with the mocked ports. */
    const run = (): Promise<boolean> =>
        deleteProjectUseCase(
            mockProjectsRepository as unknown as ProjectsRepository,
            mockContainerRuntime as unknown as ContainerRuntime,
            namespaceId,
            id,
        );

    beforeEach(() => {
        jest.clearAllMocks();
        mockProjectsRepository = {
            findById: jest.fn(),
            delete: jest.fn(),
        };
        mockContainerRuntime = {
            listNetworks: jest.fn().mockResolvedValue([]),
            removeNetwork: jest.fn().mockResolvedValue(undefined),
        };
    });

    it('looks the project up before it deletes it', async () => {
        mockProjectsRepository.findById.mockResolvedValue(project);
        mockProjectsRepository.delete.mockResolvedValue(true);

        await run();

        expect(mockProjectsRepository.findById).toHaveBeenCalledTimes(1);
        expect(mockProjectsRepository.findById).toHaveBeenCalledWith(id);
    });

    it('delegates deletion to the repository with the provided id', async () => {
        mockProjectsRepository.findById.mockResolvedValue(project);
        mockProjectsRepository.delete.mockResolvedValue(true);

        await run();

        expect(mockProjectsRepository.delete).toHaveBeenCalledTimes(1);
        expect(mockProjectsRepository.delete).toHaveBeenCalledWith(id);
    });

    it('returns true when the repository deletes a row', async () => {
        mockProjectsRepository.findById.mockResolvedValue(project);
        mockProjectsRepository.delete.mockResolvedValue(true);

        const result = await run();

        expect(result).toBe(true);
    });

    it('returns false when the repository deletes nothing', async () => {
        mockProjectsRepository.findById.mockResolvedValue(project);
        mockProjectsRepository.delete.mockResolvedValue(false);

        const result = await run();

        expect(result).toBe(false);
    });

    it('lists the networks of the daemon with no selector', async () => {
        mockProjectsRepository.findById.mockResolvedValue(project);
        mockProjectsRepository.delete.mockResolvedValue(true);

        await run();

        expect(mockContainerRuntime.listNetworks).toHaveBeenCalledTimes(1);
        expect(mockContainerRuntime.listNetworks).toHaveBeenCalledWith({});
    });

    it('removes every network of the project on the daemon', async () => {
        mockProjectsRepository.findById.mockResolvedValue(project);
        mockProjectsRepository.delete.mockResolvedValue(true);
        mockContainerRuntime.listNetworks.mockResolvedValue([
            networkSummary({ name: `gitpaas-${id}-cd0a7f34-7b8c-4e8f-9f1a-2b3c4d5e6f70` }),
            networkSummary({ name: `gitpaas-${id}-1f0e2d3c-4b5a-4c6d-8e9f-0a1b2c3d4e5f` }),
        ]);

        await run();

        expect(mockContainerRuntime.removeNetwork).toHaveBeenCalledTimes(2);
        expect(mockContainerRuntime.removeNetwork).toHaveBeenNthCalledWith(
            1,
            `gitpaas-${id}-cd0a7f34-7b8c-4e8f-9f1a-2b3c4d5e6f70`,
        );
        expect(mockContainerRuntime.removeNetwork).toHaveBeenNthCalledWith(
            2,
            `gitpaas-${id}-1f0e2d3c-4b5a-4c6d-8e9f-0a1b2c3d4e5f`,
        );
    });

    it('never removes a network that belongs to another project', async () => {
        mockProjectsRepository.findById.mockResolvedValue(project);
        mockProjectsRepository.delete.mockResolvedValue(true);
        mockContainerRuntime.listNetworks.mockResolvedValue([
            networkSummary({ name: 'bridge' }),
            networkSummary({ name: 'gitpaas-proxy' }),
            networkSummary({
                name: `gitpaas-${otherNamespaceId}-cd0a7f34-7b8c-4e8f-9f1a-2b3c4d5e6f70`,
            }),
        ]);

        await run();

        expect(mockContainerRuntime.removeNetwork).not.toHaveBeenCalled();
    });

    it('never removes a network when the daemon holds none', async () => {
        mockProjectsRepository.findById.mockResolvedValue(project);
        mockProjectsRepository.delete.mockResolvedValue(true);
        mockContainerRuntime.listNetworks.mockResolvedValue([]);

        await run();

        expect(mockContainerRuntime.removeNetwork).not.toHaveBeenCalled();
    });

    it('removes the networks of the daemon before it deletes the project', async () => {
        const order: string[] = [];

        mockProjectsRepository.findById.mockResolvedValue(project);
        mockContainerRuntime.listNetworks.mockResolvedValue([
            networkSummary({ name: `gitpaas-${id}-cd0a7f34-7b8c-4e8f-9f1a-2b3c4d5e6f70` }),
        ]);
        // eslint-disable-next-line @typescript-eslint/require-await
        mockContainerRuntime.removeNetwork.mockImplementation(async () => {
            order.push('removeNetwork');
        });
        // eslint-disable-next-line @typescript-eslint/require-await
        mockProjectsRepository.delete.mockImplementation(async () => {
            order.push('delete');

            return true;
        });

        await run();

        expect(order).toEqual(['removeNetwork', 'delete']);
    });

    it('throws a ProjectNotFoundError when the project does not exist', async () => {
        mockProjectsRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ProjectNotFoundError);
    });

    it('never deletes when the project does not exist', async () => {
        mockProjectsRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ProjectNotFoundError);
        expect(mockProjectsRepository.delete).not.toHaveBeenCalled();
    });

    it('never touches the networks of the daemon when the project does not exist', async () => {
        mockProjectsRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ProjectNotFoundError);
        expect(mockContainerRuntime.listNetworks).not.toHaveBeenCalled();
        expect(mockContainerRuntime.removeNetwork).not.toHaveBeenCalled();
    });

    it('throws a ProjectNotFoundError when the project belongs to another namespace', async () => {
        mockProjectsRepository.findById.mockResolvedValue({ ...project, namespaceId: otherNamespaceId });

        await expect(run()).rejects.toBeInstanceOf(ProjectNotFoundError);
    });

    it('never deletes a project that belongs to another namespace', async () => {
        mockProjectsRepository.findById.mockResolvedValue({ ...project, namespaceId: otherNamespaceId });

        await expect(run()).rejects.toThrow(`Project ${id} not found`);
        expect(mockProjectsRepository.delete).not.toHaveBeenCalled();
    });

    it('propagates errors thrown by the lookup', async () => {
        const error = new Error('database unavailable');
        mockProjectsRepository.findById.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });

    it('propagates errors thrown by the removal of a network', async () => {
        const error = new Error('network has active endpoints');
        mockProjectsRepository.findById.mockResolvedValue(project);
        mockContainerRuntime.listNetworks.mockResolvedValue([
            networkSummary({ name: `gitpaas-${id}-cd0a7f34-7b8c-4e8f-9f1a-2b3c4d5e6f70` }),
        ]);
        mockContainerRuntime.removeNetwork.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
        expect(mockProjectsRepository.delete).not.toHaveBeenCalled();
    });

    it('propagates errors thrown by the deletion', async () => {
        const error = new Error('database unavailable');
        mockProjectsRepository.findById.mockResolvedValue(project);
        mockProjectsRepository.delete.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
