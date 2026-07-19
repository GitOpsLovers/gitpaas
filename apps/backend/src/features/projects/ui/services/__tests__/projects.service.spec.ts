import { Test } from '@nestjs/testing';

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

const mockCreateProjectUseCase = createProjectUseCase as jest.MockedFunction<
    typeof createProjectUseCase
>;
const mockDeleteProjectUseCase = deleteProjectUseCase as jest.MockedFunction<
    typeof deleteProjectUseCase
>;
const mockFindProjectByIdUseCase = findProjectByIdUseCase as jest.MockedFunction<
    typeof findProjectByIdUseCase
>;
const mockGetAllProjectsUseCase = getAllProjectsUseCase as jest.MockedFunction<
    typeof getAllProjectsUseCase
>;
const mockUpdateProjectUseCase = updateProjectUseCase as jest.MockedFunction<
    typeof updateProjectUseCase
>;

const projectId = 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60';

const project: Project = {
    id: projectId,
    name: 'platform',
    servicesCount: 3,
};

describe('ProjectsService', () => {
    let mockProjectsRepository: jest.Mocked<ProjectsDatabaseRepository>;
    let sut: ProjectsService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockProjectsRepository = {} as jest.Mocked<ProjectsDatabaseRepository>;

        const moduleRef = await Test.createTestingModule({
            providers: [
                ProjectsService,
                { provide: ProjectsDatabaseRepository, useValue: mockProjectsRepository },
            ],
        }).compile();

        sut = moduleRef.get(ProjectsService);
    });

    describe('getAll', () => {
        it('delegates to the use case with the repository', async () => {
            mockGetAllProjectsUseCase.mockResolvedValue([project]);

            await sut.getAll();

            expect(mockGetAllProjectsUseCase).toHaveBeenCalledTimes(1);
            expect(mockGetAllProjectsUseCase).toHaveBeenCalledWith(mockProjectsRepository);
        });

        it('returns the projects produced by the use case', async () => {
            mockGetAllProjectsUseCase.mockResolvedValue([project]);

            const result = await sut.getAll();

            expect(result).toEqual([project]);
        });

        it('returns an empty list when there are no projects', async () => {
            mockGetAllProjectsUseCase.mockResolvedValue([]);

            const result = await sut.getAll();

            expect(result).toEqual([]);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            mockGetAllProjectsUseCase.mockRejectedValue(error);

            await expect(sut.getAll()).rejects.toThrow(error);
        });
    });

    describe('findById', () => {
        it('delegates to the use case with the repository and id', async () => {
            mockFindProjectByIdUseCase.mockResolvedValue(project);

            await sut.findById(projectId);

            expect(mockFindProjectByIdUseCase).toHaveBeenCalledTimes(1);
            expect(mockFindProjectByIdUseCase).toHaveBeenCalledWith(mockProjectsRepository, projectId);
        });

        it('returns the project produced by the use case', async () => {
            mockFindProjectByIdUseCase.mockResolvedValue(project);

            const result = await sut.findById(projectId);

            expect(result).toBe(project);
        });

        it('returns null when the project does not exist', async () => {
            mockFindProjectByIdUseCase.mockResolvedValue(null);

            const result = await sut.findById(projectId);

            expect(result).toBeNull();
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            mockFindProjectByIdUseCase.mockRejectedValue(error);

            await expect(sut.findById(projectId)).rejects.toThrow(error);
        });
    });

    describe('create', () => {
        const createDto: CreateProjectDto = { name: 'platform' };

        it('delegates to the use case with the repository and the dto', async () => {
            mockCreateProjectUseCase.mockResolvedValue(project);

            await sut.create(createDto);

            expect(mockCreateProjectUseCase).toHaveBeenCalledTimes(1);
            expect(mockCreateProjectUseCase).toHaveBeenCalledWith(mockProjectsRepository, createDto);
        });

        it('returns the created project', async () => {
            mockCreateProjectUseCase.mockResolvedValue(project);

            const result = await sut.create(createDto);

            expect(result).toBe(project);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('name already taken');
            mockCreateProjectUseCase.mockRejectedValue(error);

            await expect(sut.create(createDto)).rejects.toThrow(error);
        });
    });

    describe('update', () => {
        const updateDto: UpdateProjectDto = { name: 'renamed' };

        it('delegates to the use case with the repository, id and the dto', async () => {
            mockUpdateProjectUseCase.mockResolvedValue(project);

            await sut.update(projectId, updateDto);

            expect(mockUpdateProjectUseCase).toHaveBeenCalledTimes(1);
            expect(mockUpdateProjectUseCase).toHaveBeenCalledWith(mockProjectsRepository, projectId, updateDto);
        });

        it('returns the updated project', async () => {
            const updated: Project = { ...project, name: 'renamed' };
            mockUpdateProjectUseCase.mockResolvedValue(updated);

            const result = await sut.update(projectId, updateDto);

            expect(result).toBe(updated);
        });

        it('returns null when the project does not exist', async () => {
            mockUpdateProjectUseCase.mockResolvedValue(null);

            const result = await sut.update(projectId, updateDto);

            expect(result).toBeNull();
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            mockUpdateProjectUseCase.mockRejectedValue(error);

            await expect(sut.update(projectId, updateDto)).rejects.toThrow(error);
        });
    });

    describe('delete', () => {
        it('delegates to the use case with the repository and id', async () => {
            mockDeleteProjectUseCase.mockResolvedValue(true);

            await sut.delete(projectId);

            expect(mockDeleteProjectUseCase).toHaveBeenCalledTimes(1);
            expect(mockDeleteProjectUseCase).toHaveBeenCalledWith(mockProjectsRepository, projectId);
        });

        it('returns true when a row was deleted', async () => {
            mockDeleteProjectUseCase.mockResolvedValue(true);

            const result = await sut.delete(projectId);

            expect(result).toBe(true);
        });

        it('returns false when nothing was deleted', async () => {
            mockDeleteProjectUseCase.mockResolvedValue(false);

            const result = await sut.delete(projectId);

            expect(result).toBe(false);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            mockDeleteProjectUseCase.mockRejectedValue(error);

            await expect(sut.delete(projectId)).rejects.toThrow(error);
        });
    });
});
