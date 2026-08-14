/* eslint-disable no-secrets/no-secrets */
import { ProjectNotFoundError } from '../../domain/errors/project.errors';
import { Project } from '../../domain/models/project.models';
import { ProjectsRepository } from '../../domain/repositories/projects.repository';
import { findProjectByIdUseCase } from '../find-project-by-id.use-case';

describe('findProjectByIdUseCase', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';
    const namespaceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
    const otherNamespaceId = '0a9d7ef7-8b6c-4f42-a1c2-9de3e33a95a1';

    const project: Project = { id, name: 'GitPaaS', namespaceId };

    let mockProjectsRepository: jest.Mocked<Pick<ProjectsRepository, 'findById'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProjectsRepository = {
            findById: jest.fn(),
        };
    });

    it('delegates the lookup to the repository with the provided id', async () => {
        mockProjectsRepository.findById.mockResolvedValue(project);

        await findProjectByIdUseCase(mockProjectsRepository as unknown as ProjectsRepository, namespaceId, id);

        expect(mockProjectsRepository.findById).toHaveBeenCalledTimes(1);
        expect(mockProjectsRepository.findById).toHaveBeenCalledWith(id);
    });

    it('returns the project when it belongs to the requested namespace', async () => {
        mockProjectsRepository.findById.mockResolvedValue(project);

        const result = await findProjectByIdUseCase(
            mockProjectsRepository as unknown as ProjectsRepository,
            namespaceId,
            id,
        );

        expect(result).toBe(project);
    });

    it('throws a ProjectNotFoundError when the project does not exist', async () => {
        mockProjectsRepository.findById.mockResolvedValue(null);

        await expect(
            findProjectByIdUseCase(mockProjectsRepository as unknown as ProjectsRepository, namespaceId, id),
        ).rejects.toBeInstanceOf(ProjectNotFoundError);
    });

    it('throws a ProjectNotFoundError when the project belongs to another namespace', async () => {
        mockProjectsRepository.findById.mockResolvedValue({ ...project, namespaceId: otherNamespaceId });

        await expect(
            findProjectByIdUseCase(mockProjectsRepository as unknown as ProjectsRepository, namespaceId, id),
        ).rejects.toBeInstanceOf(ProjectNotFoundError);
    });

    it('never leaks the existence of a project of another namespace in the message', async () => {
        mockProjectsRepository.findById.mockResolvedValue({ ...project, namespaceId: otherNamespaceId });

        await expect(
            findProjectByIdUseCase(mockProjectsRepository as unknown as ProjectsRepository, namespaceId, id),
        ).rejects.toThrow(`Project ${id} not found`);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        mockProjectsRepository.findById.mockRejectedValue(error);

        await expect(
            findProjectByIdUseCase(mockProjectsRepository as unknown as ProjectsRepository, namespaceId, id),
        ).rejects.toThrow(error);
    });
});
