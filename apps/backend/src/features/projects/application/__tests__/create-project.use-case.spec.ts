import { CreateProjectDto } from '../../domain/dtos/create-project.dto';
import { Project } from '../../domain/models/project.model';
import { ProjectsRepository } from '../../domain/repositories/projects.repository';
import { createProjectUseCase } from '../create-project.use-case';

describe('createProjectUseCase', () => {
    const createDto: CreateProjectDto = { name: 'GitPaaS' };

    const createdProject: Project = {
        id: '9c858901-8a57-4791-81fe-4c455b099bc9',
        name: createDto.name,
    };

    let mockProjectsRepository: jest.Mocked<Pick<ProjectsRepository, 'create'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProjectsRepository = {
            create: jest.fn(),
        };
    });

    it('delegates creation to the repository with the provided DTO', async () => {
        mockProjectsRepository.create.mockResolvedValue(createdProject);

        await createProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, createDto);

        expect(mockProjectsRepository.create).toHaveBeenCalledTimes(1);
        expect(mockProjectsRepository.create).toHaveBeenCalledWith(createDto);
    });

    it('returns the project created by the repository', async () => {
        mockProjectsRepository.create.mockResolvedValue(createdProject);

        const result = await createProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, createDto);

        expect(result).toBe(createdProject);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        mockProjectsRepository.create.mockRejectedValue(error);

        await expect(
            createProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, createDto),
        ).rejects.toThrow(error);
    });
});
