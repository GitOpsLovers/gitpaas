import { ProjectNotFoundError } from '../../domain/errors/project.errors';
import { Project } from '../../domain/models/project.models';
import { ProjectsRepository } from '../../domain/repositories/projects.repository';
import { deleteProjectUseCase } from '../delete-project.use-case';

describe('deleteProjectUseCase', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';
    const namespaceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
    const otherNamespaceId = '0a9d7ef7-8b6c-4f42-a1c2-9de3e33a95a1';

    const project: Project = { id, name: 'GitPaaS', namespaceId };

    let mockProjectsRepository: jest.Mocked<Pick<ProjectsRepository, 'findById' | 'delete'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProjectsRepository = {
            findById: jest.fn(),
            delete: jest.fn(),
        };
    });

    it('looks the project up before it deletes it', async () => {
        mockProjectsRepository.findById.mockResolvedValue(project);
        mockProjectsRepository.delete.mockResolvedValue(true);

        await deleteProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, namespaceId, id);

        expect(mockProjectsRepository.findById).toHaveBeenCalledTimes(1);
        expect(mockProjectsRepository.findById).toHaveBeenCalledWith(id);
    });

    it('delegates deletion to the repository with the provided id', async () => {
        mockProjectsRepository.findById.mockResolvedValue(project);
        mockProjectsRepository.delete.mockResolvedValue(true);

        await deleteProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, namespaceId, id);

        expect(mockProjectsRepository.delete).toHaveBeenCalledTimes(1);
        expect(mockProjectsRepository.delete).toHaveBeenCalledWith(id);
    });

    it('returns true when the repository deletes a row', async () => {
        mockProjectsRepository.findById.mockResolvedValue(project);
        mockProjectsRepository.delete.mockResolvedValue(true);

        const result = await deleteProjectUseCase(
            mockProjectsRepository as unknown as ProjectsRepository,
            namespaceId,
            id,
        );

        expect(result).toBe(true);
    });

    it('returns false when the repository deletes nothing', async () => {
        mockProjectsRepository.findById.mockResolvedValue(project);
        mockProjectsRepository.delete.mockResolvedValue(false);

        const result = await deleteProjectUseCase(
            mockProjectsRepository as unknown as ProjectsRepository,
            namespaceId,
            id,
        );

        expect(result).toBe(false);
    });

    it('throws a ProjectNotFoundError when the project does not exist', async () => {
        mockProjectsRepository.findById.mockResolvedValue(null);

        await expect(
            deleteProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, namespaceId, id),
        ).rejects.toBeInstanceOf(ProjectNotFoundError);
    });

    it('never deletes when the project does not exist', async () => {
        mockProjectsRepository.findById.mockResolvedValue(null);

        await expect(
            deleteProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, namespaceId, id),
        ).rejects.toBeInstanceOf(ProjectNotFoundError);
        expect(mockProjectsRepository.delete).not.toHaveBeenCalled();
    });

    it('throws a ProjectNotFoundError when the project belongs to another namespace', async () => {
        mockProjectsRepository.findById.mockResolvedValue({ ...project, namespaceId: otherNamespaceId });

        await expect(
            deleteProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, namespaceId, id),
        ).rejects.toBeInstanceOf(ProjectNotFoundError);
    });

    it('never deletes a project that belongs to another namespace', async () => {
        mockProjectsRepository.findById.mockResolvedValue({ ...project, namespaceId: otherNamespaceId });

        await expect(
            deleteProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, namespaceId, id),
        ).rejects.toThrow(`Project ${id} not found`);
        expect(mockProjectsRepository.delete).not.toHaveBeenCalled();
    });

    it('propagates errors thrown by the lookup', async () => {
        const error = new Error('database unavailable');
        mockProjectsRepository.findById.mockRejectedValue(error);

        await expect(
            deleteProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, namespaceId, id),
        ).rejects.toThrow(error);
    });

    it('propagates errors thrown by the deletion', async () => {
        const error = new Error('database unavailable');
        mockProjectsRepository.findById.mockResolvedValue(project);
        mockProjectsRepository.delete.mockRejectedValue(error);

        await expect(
            deleteProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, namespaceId, id),
        ).rejects.toThrow(error);
    });
});
