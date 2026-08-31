import type { CreateProjectDto, UpdateProjectDto } from '@gitpaas/contracts';
import { Test } from '@nestjs/testing';

import { createProjectUseCase } from '../../../application/create-project.use-case';
import { deleteProjectUseCase } from '../../../application/delete-project.use-case';
import { findProjectByIdUseCase } from '../../../application/find-project-by-id.use-case';
import { getAllProjectsUseCase } from '../../../application/get-all-projects.use-case';
import { updateProjectUseCase } from '../../../application/update-project.use-case';
import { ProjectNotFoundError } from '../../../domain/errors/project.errors';
import { Project } from '../../../domain/models/project.models';
import { DatabaseProjectsRepository } from '../../../infrastructure/database/db-projects.repository';
import { ProjectsService } from '../projects.service';

import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';

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
const namespaceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const project: Project = {
    id: projectId,
    name: 'platform',
    description: 'The control plane',
    namespaceId,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    servicesCount: 3,
};

describe('ProjectsService', () => {
    let mockProjectsRepository: jest.Mocked<DatabaseProjectsRepository>;
    let mockContainerRuntime: jest.Mocked<DockerContainerRuntimeAdapter>;
    let sut: ProjectsService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockProjectsRepository = {} as jest.Mocked<DatabaseProjectsRepository>;
        mockContainerRuntime = {} as jest.Mocked<DockerContainerRuntimeAdapter>;

        const moduleRef = await Test.createTestingModule({
            providers: [
                ProjectsService,
                { provide: DatabaseProjectsRepository, useValue: mockProjectsRepository },
                { provide: DockerContainerRuntimeAdapter, useValue: mockContainerRuntime },
            ],
        }).compile();

        sut = moduleRef.get(ProjectsService);
    });

    describe('getAll', () => {
        it('delegates to the use case with the repository and the namespace', async () => {
            mockGetAllProjectsUseCase.mockResolvedValue([project]);

            await sut.getAll(namespaceId);

            expect(mockGetAllProjectsUseCase).toHaveBeenCalledTimes(1);
            expect(mockGetAllProjectsUseCase).toHaveBeenCalledWith(mockProjectsRepository, namespaceId);
        });

        it('returns the projects produced by the use case', async () => {
            mockGetAllProjectsUseCase.mockResolvedValue([project]);

            const result = await sut.getAll(namespaceId);

            expect(result).toEqual([project]);
        });

        it('returns an empty list when the namespace holds no project', async () => {
            mockGetAllProjectsUseCase.mockResolvedValue([]);

            const result = await sut.getAll(namespaceId);

            expect(result).toEqual([]);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            mockGetAllProjectsUseCase.mockRejectedValue(error);

            await expect(sut.getAll(namespaceId)).rejects.toThrow(error);
        });
    });

    describe('findById', () => {
        it('delegates to the use case with the repository, the namespace and the id', async () => {
            mockFindProjectByIdUseCase.mockResolvedValue(project);

            await sut.findById(namespaceId, projectId);

            expect(mockFindProjectByIdUseCase).toHaveBeenCalledTimes(1);
            expect(mockFindProjectByIdUseCase).toHaveBeenCalledWith(
                mockProjectsRepository,
                namespaceId,
                projectId,
            );
        });

        it('returns the project produced by the use case', async () => {
            mockFindProjectByIdUseCase.mockResolvedValue(project);

            const result = await sut.findById(namespaceId, projectId);

            expect(result).toBe(project);
        });

        it('propagates the not-found domain error raised by the use case', async () => {
            mockFindProjectByIdUseCase.mockRejectedValue(new ProjectNotFoundError(projectId));

            await expect(sut.findById(namespaceId, projectId)).rejects.toBeInstanceOf(ProjectNotFoundError);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            mockFindProjectByIdUseCase.mockRejectedValue(error);

            await expect(sut.findById(namespaceId, projectId)).rejects.toThrow(error);
        });
    });

    describe('create', () => {
        const createDto: CreateProjectDto = { name: 'platform' };

        it('delegates to the use case with the repository, the namespace and the dto', async () => {
            mockCreateProjectUseCase.mockResolvedValue(project);

            await sut.create(namespaceId, createDto);

            expect(mockCreateProjectUseCase).toHaveBeenCalledTimes(1);
            expect(mockCreateProjectUseCase).toHaveBeenCalledWith(
                mockProjectsRepository,
                namespaceId,
                createDto,
            );
        });

        it('returns the created project', async () => {
            mockCreateProjectUseCase.mockResolvedValue(project);

            const result = await sut.create(namespaceId, createDto);

            expect(result).toBe(project);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('name already taken');
            mockCreateProjectUseCase.mockRejectedValue(error);

            await expect(sut.create(namespaceId, createDto)).rejects.toThrow(error);
        });
    });

    describe('update', () => {
        const updateDto: UpdateProjectDto = { name: 'renamed' };

        it('delegates to the use case with the repository, the namespace, the id and the dto', async () => {
            mockUpdateProjectUseCase.mockResolvedValue(project);

            await sut.update(namespaceId, projectId, updateDto);

            expect(mockUpdateProjectUseCase).toHaveBeenCalledTimes(1);
            expect(mockUpdateProjectUseCase).toHaveBeenCalledWith(
                mockProjectsRepository,
                namespaceId,
                projectId,
                updateDto,
            );
        });

        it('returns the updated project', async () => {
            const updated: Project = { ...project, name: 'renamed' };
            mockUpdateProjectUseCase.mockResolvedValue(updated);

            const result = await sut.update(namespaceId, projectId, updateDto);

            expect(result).toBe(updated);
        });

        it('propagates the not-found domain error raised by the use case', async () => {
            mockUpdateProjectUseCase.mockRejectedValue(new ProjectNotFoundError(projectId));

            await expect(sut.update(namespaceId, projectId, updateDto)).rejects.toBeInstanceOf(
                ProjectNotFoundError,
            );
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            mockUpdateProjectUseCase.mockRejectedValue(error);

            await expect(sut.update(namespaceId, projectId, updateDto)).rejects.toThrow(error);
        });
    });

    describe('delete', () => {
        it('delegates to the use case with the repository, the runtime, the namespace and the id', async () => {
            mockDeleteProjectUseCase.mockResolvedValue(true);

            await sut.delete(namespaceId, projectId);

            expect(mockDeleteProjectUseCase).toHaveBeenCalledTimes(1);
            expect(mockDeleteProjectUseCase).toHaveBeenCalledWith(
                mockProjectsRepository,
                mockContainerRuntime,
                namespaceId,
                projectId,
            );
        });

        it('returns true when a row was deleted', async () => {
            mockDeleteProjectUseCase.mockResolvedValue(true);

            const result = await sut.delete(namespaceId, projectId);

            expect(result).toBe(true);
        });

        it('returns false when nothing was deleted', async () => {
            mockDeleteProjectUseCase.mockResolvedValue(false);

            const result = await sut.delete(namespaceId, projectId);

            expect(result).toBe(false);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            mockDeleteProjectUseCase.mockRejectedValue(error);

            await expect(sut.delete(namespaceId, projectId)).rejects.toThrow(error);
        });
    });

    describe('telemetry event enrichment', () => {
        it('adds the id of the created project', async () => {
            mockCreateProjectUseCase.mockResolvedValue(project);

            const event = await runWithTelemetry({}, async () => {
                await sut.create(namespaceId, { name: 'platform' });

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'project.id': projectId });
        });

        it('adds the namespace of the created project', async () => {
            mockCreateProjectUseCase.mockResolvedValue(project);

            const event = await runWithTelemetry({}, async () => {
                await sut.create(namespaceId, { name: 'platform' });

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'namespace.id': namespaceId });
        });

        it('adds the namespace and the id of an update', async () => {
            mockUpdateProjectUseCase.mockResolvedValue(project);

            const event = await runWithTelemetry({}, async () => {
                await sut.update(namespaceId, projectId, { name: 'renamed' });

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'namespace.id': namespaceId, 'project.id': projectId });
        });

        it('adds the namespace and the id of an update that the use case rejects', async () => {
            mockUpdateProjectUseCase.mockRejectedValue(new ProjectNotFoundError(projectId));

            const event = await runWithTelemetry({}, async () => {
                await expect(sut.update(namespaceId, projectId, { name: 'renamed' })).rejects.toBeInstanceOf(
                    ProjectNotFoundError,
                );

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'namespace.id': namespaceId, 'project.id': projectId });
        });

        it('never enriches the event of a failed create, since the id only exists after the write', async () => {
            mockCreateProjectUseCase.mockRejectedValue(new Error('name already taken'));

            const event = await runWithTelemetry({}, async () => {
                await expect(sut.create(namespaceId, { name: 'platform' })).rejects.toThrow('name already taken');

                return getTelemetry();
            });

            expect(event).toEqual({});
        });
    });
});
