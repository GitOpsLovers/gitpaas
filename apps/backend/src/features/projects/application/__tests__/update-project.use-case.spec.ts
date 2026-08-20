import type { UpdateProjectDto } from '@gitpaas/contracts';

import { ProjectNotFoundError } from '../../domain/errors/project.errors';
import { Project } from '../../domain/models/project.models';
import { ProjectsRepository } from '../../domain/repositories/projects.repository';
import { updateProjectUseCase } from '../update-project.use-case';

describe('updateProjectUseCase', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';
    const namespaceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
    const otherNamespaceId = '0a9d7ef7-8b6c-4f42-a1c2-9de3e33a95a1';
    const updateDto: UpdateProjectDto = { name: 'Renamed' };

    const existingProject: Project = { id, name: 'GitPaaS', namespaceId };
    const updatedProject: Project = { id, name: updateDto.name, namespaceId };

    let mockProjectsRepository: jest.Mocked<Pick<ProjectsRepository, 'findById' | 'update'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProjectsRepository = {
            findById: jest.fn(),
            update: jest.fn(),
        };
    });

    it('looks the project up before it updates it', async () => {
        mockProjectsRepository.findById.mockResolvedValue(existingProject);
        mockProjectsRepository.update.mockResolvedValue(updatedProject);

        await updateProjectUseCase(
            mockProjectsRepository as unknown as ProjectsRepository,
            namespaceId,
            id,
            updateDto,
        );

        expect(mockProjectsRepository.findById).toHaveBeenCalledTimes(1);
        expect(mockProjectsRepository.findById).toHaveBeenCalledWith(id);
    });

    it('delegates the update to the repository with the provided id and DTO', async () => {
        mockProjectsRepository.findById.mockResolvedValue(existingProject);
        mockProjectsRepository.update.mockResolvedValue(updatedProject);

        await updateProjectUseCase(
            mockProjectsRepository as unknown as ProjectsRepository,
            namespaceId,
            id,
            updateDto,
        );

        expect(mockProjectsRepository.update).toHaveBeenCalledTimes(1);
        expect(mockProjectsRepository.update).toHaveBeenCalledWith(id, updateDto);
    });

    it('returns the project updated by the repository', async () => {
        mockProjectsRepository.findById.mockResolvedValue(existingProject);
        mockProjectsRepository.update.mockResolvedValue(updatedProject);

        const result = await updateProjectUseCase(
            mockProjectsRepository as unknown as ProjectsRepository,
            namespaceId,
            id,
            updateDto,
        );

        expect(result).toBe(updatedProject);
    });

    it('throws a ProjectNotFoundError when the project does not exist', async () => {
        mockProjectsRepository.findById.mockResolvedValue(null);

        await expect(
            updateProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, namespaceId, id, updateDto),
        ).rejects.toBeInstanceOf(ProjectNotFoundError);
    });

    it('never updates when the project does not exist', async () => {
        mockProjectsRepository.findById.mockResolvedValue(null);

        await expect(
            updateProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, namespaceId, id, updateDto),
        ).rejects.toBeInstanceOf(ProjectNotFoundError);
        expect(mockProjectsRepository.update).not.toHaveBeenCalled();
    });

    it('throws a ProjectNotFoundError when the project belongs to another namespace', async () => {
        mockProjectsRepository.findById.mockResolvedValue({ ...existingProject, namespaceId: otherNamespaceId });

        await expect(
            updateProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, namespaceId, id, updateDto),
        ).rejects.toBeInstanceOf(ProjectNotFoundError);
    });

    it('never updates a project that belongs to another namespace', async () => {
        mockProjectsRepository.findById.mockResolvedValue({ ...existingProject, namespaceId: otherNamespaceId });

        await expect(
            updateProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, namespaceId, id, updateDto),
        ).rejects.toThrow(`Project ${id} not found`);
        expect(mockProjectsRepository.update).not.toHaveBeenCalled();
    });

    it('throws a ProjectNotFoundError when the row disappears between the lookup and the update', async () => {
        mockProjectsRepository.findById.mockResolvedValue(existingProject);
        mockProjectsRepository.update.mockResolvedValue(null);

        await expect(
            updateProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, namespaceId, id, updateDto),
        ).rejects.toBeInstanceOf(ProjectNotFoundError);
    });

    it('propagates errors thrown by the lookup', async () => {
        const error = new Error('database unavailable');
        mockProjectsRepository.findById.mockRejectedValue(error);

        await expect(
            updateProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, namespaceId, id, updateDto),
        ).rejects.toThrow(error);
    });

    it('propagates errors thrown by the update', async () => {
        const error = new Error('database unavailable');
        mockProjectsRepository.findById.mockResolvedValue(existingProject);
        mockProjectsRepository.update.mockRejectedValue(error);

        await expect(
            updateProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, namespaceId, id, updateDto),
        ).rejects.toThrow(error);
    });
});
