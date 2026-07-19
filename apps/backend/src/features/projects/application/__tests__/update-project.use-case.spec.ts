import { UpdateProjectDto } from '../../domain/dtos/update-project.dto';
import { Project } from '../../domain/models/project.model';
import { ProjectsRepository } from '../../domain/repositories/projects.repository';
import { updateProjectUseCase } from '../update-project.use-case';

describe('updateProjectUseCase', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';
    const updateDto: UpdateProjectDto = { name: 'Renamed' };

    const updatedProject: Project = { id, name: updateDto.name };

    let mockProjectsRepository: jest.Mocked<Pick<ProjectsRepository, 'update'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProjectsRepository = {
            update: jest.fn(),
        };
    });

    it('delegates the update to the repository with the provided id and DTO', async () => {
        mockProjectsRepository.update.mockResolvedValue(updatedProject);

        await updateProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, id, updateDto);

        expect(mockProjectsRepository.update).toHaveBeenCalledTimes(1);
        expect(mockProjectsRepository.update).toHaveBeenCalledWith(id, updateDto);
    });

    it('returns the project updated by the repository', async () => {
        mockProjectsRepository.update.mockResolvedValue(updatedProject);

        const result = await updateProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, id, updateDto);

        expect(result).toBe(updatedProject);
    });

    it('returns null when the project does not exist', async () => {
        mockProjectsRepository.update.mockResolvedValue(null);

        const result = await updateProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, id, updateDto);

        expect(result).toBeNull();
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        mockProjectsRepository.update.mockRejectedValue(error);

        await expect(
            updateProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, id, updateDto),
        ).rejects.toThrow(error);
    });
});
