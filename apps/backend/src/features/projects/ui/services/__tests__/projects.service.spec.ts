import { createProjectUseCase } from '../../../application/create-project.use-case';
import { deleteProjectUseCase } from '../../../application/delete-project.use-case';
import { findProjectByIdUseCase } from '../../../application/find-project-by-id.use-case';
import { getAllProjectsUseCase } from '../../../application/get-all-projects.use-case';
import { updateProjectUseCase } from '../../../application/update-project.use-case';
import { CreateProjectDto } from '../../../domain/dtos/create-project.dto';
import { UpdateProjectDto } from '../../../domain/dtos/update-project.dto';
import { Project } from '../../../domain/models/project.model';
import { ProjectsDatabaseRepository } from '../../../infrastructure/database/projects-db.repository';
import { ProjectsService } from '../projects.service';

jest.mock('../../../application/create-project.use-case');
jest.mock('../../../application/delete-project.use-case');
jest.mock('../../../application/find-project-by-id.use-case');
jest.mock('../../../application/get-all-projects.use-case');
jest.mock('../../../application/update-project.use-case');

const createProjectUseCaseMock = createProjectUseCase as jest.MockedFunction<
    typeof createProjectUseCase
>;
const deleteProjectUseCaseMock = deleteProjectUseCase as jest.MockedFunction<
    typeof deleteProjectUseCase
>;
const findProjectByIdUseCaseMock = findProjectByIdUseCase as jest.MockedFunction<
    typeof findProjectByIdUseCase
>;
const getAllProjectsUseCaseMock = getAllProjectsUseCase as jest.MockedFunction<
    typeof getAllProjectsUseCase
>;
const updateProjectUseCaseMock = updateProjectUseCase as jest.MockedFunction<
    typeof updateProjectUseCase
>;

const projectId = 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60';

const project: Project = {
    id: projectId,
    name: 'platform',
    servicesCount: 3,
};

describe('ProjectsService', () => {
    let repository: jest.Mocked<ProjectsDatabaseRepository>;
    let sut: ProjectsService;

    beforeEach(() => {
        jest.clearAllMocks();

        repository = {} as jest.Mocked<ProjectsDatabaseRepository>;

        sut = new ProjectsService(repository);
    });

    describe('getAll', () => {
        it('delegates to the use case with the repository', async () => {
            getAllProjectsUseCaseMock.mockResolvedValue([project]);

            await sut.getAll();

            expect(getAllProjectsUseCaseMock).toHaveBeenCalledTimes(1);
            expect(getAllProjectsUseCaseMock).toHaveBeenCalledWith(repository);
        });

        it('returns the projects produced by the use case', async () => {
            getAllProjectsUseCaseMock.mockResolvedValue([project]);

            const result = await sut.getAll();

            expect(result).toEqual([project]);
        });

        it('returns an empty list when there are no projects', async () => {
            getAllProjectsUseCaseMock.mockResolvedValue([]);

            const result = await sut.getAll();

            expect(result).toEqual([]);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            getAllProjectsUseCaseMock.mockRejectedValue(error);

            await expect(sut.getAll()).rejects.toThrow(error);
        });
    });

    describe('findById', () => {
        it('delegates to the use case with the repository and id', async () => {
            findProjectByIdUseCaseMock.mockResolvedValue(project);

            await sut.findById(projectId);

            expect(findProjectByIdUseCaseMock).toHaveBeenCalledTimes(1);
            expect(findProjectByIdUseCaseMock).toHaveBeenCalledWith(repository, projectId);
        });

        it('returns the project produced by the use case', async () => {
            findProjectByIdUseCaseMock.mockResolvedValue(project);

            const result = await sut.findById(projectId);

            expect(result).toBe(project);
        });

        it('returns null when the project does not exist', async () => {
            findProjectByIdUseCaseMock.mockResolvedValue(null);

            const result = await sut.findById(projectId);

            expect(result).toBeNull();
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            findProjectByIdUseCaseMock.mockRejectedValue(error);

            await expect(sut.findById(projectId)).rejects.toThrow(error);
        });
    });

    describe('create', () => {
        const createDto: CreateProjectDto = { name: 'platform' };

        it('delegates to the use case with the repository and the dto', async () => {
            createProjectUseCaseMock.mockResolvedValue(project);

            await sut.create(createDto);

            expect(createProjectUseCaseMock).toHaveBeenCalledTimes(1);
            expect(createProjectUseCaseMock).toHaveBeenCalledWith(repository, createDto);
        });

        it('returns the created project', async () => {
            createProjectUseCaseMock.mockResolvedValue(project);

            const result = await sut.create(createDto);

            expect(result).toBe(project);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('name already taken');
            createProjectUseCaseMock.mockRejectedValue(error);

            await expect(sut.create(createDto)).rejects.toThrow(error);
        });
    });

    describe('update', () => {
        const updateDto: UpdateProjectDto = { name: 'renamed' };

        it('delegates to the use case with the repository, id and the dto', async () => {
            updateProjectUseCaseMock.mockResolvedValue(project);

            await sut.update(projectId, updateDto);

            expect(updateProjectUseCaseMock).toHaveBeenCalledTimes(1);
            expect(updateProjectUseCaseMock).toHaveBeenCalledWith(repository, projectId, updateDto);
        });

        it('returns the updated project', async () => {
            const updated: Project = { ...project, name: 'renamed' };
            updateProjectUseCaseMock.mockResolvedValue(updated);

            const result = await sut.update(projectId, updateDto);

            expect(result).toBe(updated);
        });

        it('returns null when the project does not exist', async () => {
            updateProjectUseCaseMock.mockResolvedValue(null);

            const result = await sut.update(projectId, updateDto);

            expect(result).toBeNull();
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            updateProjectUseCaseMock.mockRejectedValue(error);

            await expect(sut.update(projectId, updateDto)).rejects.toThrow(error);
        });
    });

    describe('delete', () => {
        it('delegates to the use case with the repository and id', async () => {
            deleteProjectUseCaseMock.mockResolvedValue(true);

            await sut.delete(projectId);

            expect(deleteProjectUseCaseMock).toHaveBeenCalledTimes(1);
            expect(deleteProjectUseCaseMock).toHaveBeenCalledWith(repository, projectId);
        });

        it('returns true when a row was deleted', async () => {
            deleteProjectUseCaseMock.mockResolvedValue(true);

            const result = await sut.delete(projectId);

            expect(result).toBe(true);
        });

        it('returns false when nothing was deleted', async () => {
            deleteProjectUseCaseMock.mockResolvedValue(false);

            const result = await sut.delete(projectId);

            expect(result).toBe(false);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            deleteProjectUseCaseMock.mockRejectedValue(error);

            await expect(sut.delete(projectId)).rejects.toThrow(error);
        });
    });
});
