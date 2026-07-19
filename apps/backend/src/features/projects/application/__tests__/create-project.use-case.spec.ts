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

    it('delegates creation to the repository with the provided DTO', async () => {
        repository.create.mockResolvedValue(createdProject);

        await createProjectUseCase(repository, createDto);

        expect(repository.create).toHaveBeenCalledTimes(1);
        expect(repository.create).toHaveBeenCalledWith(createDto);
    });

    it('returns the project created by the repository', async () => {
        repository.create.mockResolvedValue(createdProject);

        const result = await createProjectUseCase(repository, createDto);

        expect(result).toBe(createdProject);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        repository.create.mockRejectedValue(error);

        await expect(createProjectUseCase(repository, createDto)).rejects.toThrow(error);
    });
});
