import { UpdateProjectDto } from '../../domain/dtos/update-project.dto';
import { Project } from '../../domain/models/project.model';
import { ProjectsRepository } from '../../domain/repositories/projects.repository';
import { updateProjectUseCase } from '../update-project.use-case';

describe('updateProjectUseCase', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';
    const updateDto: UpdateProjectDto = { name: 'Renamed' };

    const updatedProject: Project = { id, name: updateDto.name };

    let repository: jest.Mocked<ProjectsRepository>;

    beforeEach(() => {
        repository = {
            getAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };
    });

    it('delegates the update to the repository with the provided id and DTO', async () => {
        repository.update.mockResolvedValue(updatedProject);

        await updateProjectUseCase(repository, id, updateDto);

        expect(repository.update).toHaveBeenCalledTimes(1);
        expect(repository.update).toHaveBeenCalledWith(id, updateDto);
    });

    it('returns the project updated by the repository', async () => {
        repository.update.mockResolvedValue(updatedProject);

        const result = await updateProjectUseCase(repository, id, updateDto);

        expect(result).toBe(updatedProject);
    });

    it('returns null when the project does not exist', async () => {
        repository.update.mockResolvedValue(null);

        const result = await updateProjectUseCase(repository, id, updateDto);

        expect(result).toBeNull();
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        repository.update.mockRejectedValue(error);

        await expect(updateProjectUseCase(repository, id, updateDto)).rejects.toThrow(error);
    });
});
