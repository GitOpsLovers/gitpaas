import type { CreateProjectDto, UpdateProjectDto } from '@gitpaas/contracts';
import { ConflictException, NotFoundException, ParseUUIDPipe } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';

import { ProjectNameTakenError, ProjectNotFoundError } from '../../../domain/errors/project.errors';
import { Project } from '../../../domain/models/project.models';
import { ProjectsService } from '../../services/projects.service';
import { ProjectsController } from '../projects.controller';

import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { ZodValidationPipe } from '@core/ui/pipes/zod-validation.pipe';

const projectId = 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60';
const namespaceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const project: Project = {
    id: projectId,
    name: 'platform',
    namespaceId,
    servicesCount: 3,
};

/**
 * Shape of a single entry of the route-argument metadata NestJS stores per handler.
 */
interface RouteArgMetadata {
    index: number;
    data: unknown;
    pipes: unknown[];
}

/**
 * Reads the pipes the controller declares for one path parameter of a handler.
 *
 * The pipes themselves are framework mechanics that the unit specs never run, so
 * this reads the declaration instead: dropping a `ParseUUIDPipe` would let a
 * non-UUID path segment reach the service, and must fail a test.
 */
const pipesFor = (handler: string, parameter: string): unknown[] => {
    // eslint-disable-next-line operator-linebreak
    const metadata =
        (Reflect.getMetadata(ROUTE_ARGS_METADATA, ProjectsController, handler) as Record<
            string,
            RouteArgMetadata
        >) ?? {};

    return Object.values(metadata).find((argument) => argument.data === parameter)?.pipes ?? [];
};

/**
 * Reads the pipes the controller declares for the body of a handler.
 *
 * Every path parameter carries its name in `data`, so the body is the one bound
 * argument that carries none.
 */
const bodyPipesFor = (handler: string): unknown[] => {
    // eslint-disable-next-line operator-linebreak
    const metadata =
        (Reflect.getMetadata(ROUTE_ARGS_METADATA, ProjectsController, handler) as Record<
            string,
            RouteArgMetadata
        >) ?? {};

    return Object.values(metadata).find((argument) => argument.data === undefined)?.pipes ?? [];
};

describe('ProjectsController', () => {
    let mockProjectsService: jest.Mocked<
        Pick<ProjectsService, 'getAll' | 'findById' | 'create' | 'update' | 'delete'>
    >;
    let sut: ProjectsController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockProjectsService = {
            getAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [ProjectsController],
            providers: [{ provide: ProjectsService, useValue: mockProjectsService }],
        }).compile();

        sut = moduleRef.get(ProjectsController);
    });

    describe('path-parameter validation', () => {
        it.each(['getAll', 'findById', 'create', 'update', 'delete'])(
            'validates the namespaceId path parameter of %s as a UUID',
            (handler) => {
                expect(pipesFor(handler, 'namespaceId')).toContain(ParseUUIDPipe);
            },
        );

        it.each(['findById', 'update', 'delete'])(
            'validates the id path parameter of %s as a UUID',
            (handler) => {
                expect(pipesFor(handler, 'id')).toContain(ParseUUIDPipe);
            },
        );

        it('never declares an id path parameter on the collection handlers', () => {
            expect(pipesFor('getAll', 'id')).toEqual([]);
            expect(pipesFor('create', 'id')).toEqual([]);
        });
    });

    describe('body validation', () => {
        it.each(['create', 'update'])('validates the body of %s with a Zod pipe', (handler) => {
            expect(bodyPipesFor(handler)).toEqual([expect.any(ZodValidationPipe)]);
        });

        it.each(['getAll', 'findById', 'delete'])('never binds a body on %s', (handler) => {
            expect(bodyPipesFor(handler)).toEqual([]);
        });
    });

    describe('getAll', () => {
        it('delegates to the service with the received namespace', async () => {
            mockProjectsService.getAll.mockResolvedValue([project]);

            await sut.getAll(namespaceId);

            expect(mockProjectsService.getAll).toHaveBeenCalledTimes(1);
            expect(mockProjectsService.getAll).toHaveBeenCalledWith(namespaceId);
        });

        it('returns the projects produced by the service', async () => {
            mockProjectsService.getAll.mockResolvedValue([project]);

            const result = await sut.getAll(namespaceId);

            expect(result).toEqual([project]);
        });

        it('returns an empty list when the namespace holds no project', async () => {
            mockProjectsService.getAll.mockResolvedValue([]);

            const result = await sut.getAll(namespaceId);

            expect(result).toEqual([]);
        });

        it('translates a not-found domain error into a NotFoundException', async () => {
            mockProjectsService.getAll.mockRejectedValue(new ProjectNotFoundError(projectId));

            await expect(sut.getAll(namespaceId)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('propagates errors that no translation covers', async () => {
            const error = new Error('db unreachable');
            mockProjectsService.getAll.mockRejectedValue(error);

            await expect(sut.getAll(namespaceId)).rejects.toBe(error);
        });
    });

    describe('findById', () => {
        it('delegates to the service with the received namespace and id', async () => {
            mockProjectsService.findById.mockResolvedValue(project);

            await sut.findById(namespaceId, projectId);

            expect(mockProjectsService.findById).toHaveBeenCalledTimes(1);
            expect(mockProjectsService.findById).toHaveBeenCalledWith(namespaceId, projectId);
        });

        it('returns the project produced by the service', async () => {
            mockProjectsService.findById.mockResolvedValue(project);

            const result = await sut.findById(namespaceId, projectId);

            expect(result).toBe(project);
        });

        it('translates a not-found domain error into a NotFoundException', async () => {
            mockProjectsService.findById.mockRejectedValue(new ProjectNotFoundError(projectId));

            await expect(sut.findById(namespaceId, projectId)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('keeps the domain message on the not-found response', async () => {
            mockProjectsService.findById.mockRejectedValue(new ProjectNotFoundError(projectId));

            await expect(sut.findById(namespaceId, projectId)).rejects.toThrow(`Project ${projectId} not found`);
        });

        it('propagates errors that no translation covers', async () => {
            const error = new Error('db unreachable');
            mockProjectsService.findById.mockRejectedValue(error);

            await expect(sut.findById(namespaceId, projectId)).rejects.toBe(error);
        });
    });

    describe('create', () => {
        const createDto: CreateProjectDto = { name: 'platform' };

        it('delegates to the service with the received namespace and dto', async () => {
            mockProjectsService.create.mockResolvedValue(project);

            await sut.create(namespaceId, createDto);

            expect(mockProjectsService.create).toHaveBeenCalledTimes(1);
            expect(mockProjectsService.create).toHaveBeenCalledWith(namespaceId, createDto);
        });

        it('returns the created project', async () => {
            mockProjectsService.create.mockResolvedValue(project);

            const result = await sut.create(namespaceId, createDto);

            expect(result).toBe(project);
        });

        it('translates a duplicate name into a ConflictException', async () => {
            mockProjectsService.create.mockRejectedValue(new ProjectNameTakenError(namespaceId, 'platform'));

            await expect(sut.create(namespaceId, createDto)).rejects.toBeInstanceOf(ConflictException);
        });

        it('names the namespace and the project in the conflict message', async () => {
            mockProjectsService.create.mockRejectedValue(new ProjectNameTakenError(namespaceId, 'platform'));

            await expect(sut.create(namespaceId, createDto)).rejects.toThrow(
                `Project platform already exists in namespace ${namespaceId}`,
            );
        });

        it('propagates errors that no translation covers', async () => {
            const error = new Error('db unreachable');
            mockProjectsService.create.mockRejectedValue(error);

            await expect(sut.create(namespaceId, createDto)).rejects.toBe(error);
        });
    });

    describe('update', () => {
        const updateDto: UpdateProjectDto = { name: 'renamed' };

        it('delegates to the service with the received namespace, id and dto', async () => {
            mockProjectsService.update.mockResolvedValue(project);

            await sut.update(namespaceId, projectId, updateDto);

            expect(mockProjectsService.update).toHaveBeenCalledTimes(1);
            expect(mockProjectsService.update).toHaveBeenCalledWith(namespaceId, projectId, updateDto);
        });

        it('returns the updated project produced by the service', async () => {
            const updated: Project = { ...project, name: 'renamed' };
            mockProjectsService.update.mockResolvedValue(updated);

            const result = await sut.update(namespaceId, projectId, updateDto);

            expect(result).toBe(updated);
        });

        it('translates a not-found domain error into a NotFoundException', async () => {
            mockProjectsService.update.mockRejectedValue(new ProjectNotFoundError(projectId));

            await expect(sut.update(namespaceId, projectId, updateDto)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('keeps the domain message on the not-found response', async () => {
            mockProjectsService.update.mockRejectedValue(new ProjectNotFoundError(projectId));

            await expect(sut.update(namespaceId, projectId, updateDto)).rejects.toThrow(
                `Project ${projectId} not found`,
            );
        });

        it('translates a duplicate name into a ConflictException', async () => {
            mockProjectsService.update.mockRejectedValue(new ProjectNameTakenError(namespaceId, 'renamed'));

            await expect(sut.update(namespaceId, projectId, updateDto)).rejects.toBeInstanceOf(ConflictException);
        });

        it('propagates errors that no translation covers', async () => {
            const error = new Error('db unreachable');
            mockProjectsService.update.mockRejectedValue(error);

            await expect(sut.update(namespaceId, projectId, updateDto)).rejects.toBe(error);
        });
    });

    describe('delete', () => {
        it('delegates to the service with the received namespace and id', async () => {
            mockProjectsService.delete.mockResolvedValue(true);

            await sut.delete(namespaceId, projectId);

            expect(mockProjectsService.delete).toHaveBeenCalledTimes(1);
            expect(mockProjectsService.delete).toHaveBeenCalledWith(namespaceId, projectId);
        });

        it('resolves with no value when a row was deleted', async () => {
            mockProjectsService.delete.mockResolvedValue(true);

            await expect(sut.delete(namespaceId, projectId)).resolves.toBeUndefined();
        });

        it('resolves with no value when the service reports no deleted row, as the use case guards the lookup', async () => {
            mockProjectsService.delete.mockResolvedValue(false);

            await expect(sut.delete(namespaceId, projectId)).resolves.toBeUndefined();
        });

        it('translates a not-found domain error into a NotFoundException', async () => {
            mockProjectsService.delete.mockRejectedValue(new ProjectNotFoundError(projectId));

            await expect(sut.delete(namespaceId, projectId)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('keeps the domain message on the not-found response', async () => {
            mockProjectsService.delete.mockRejectedValue(new ProjectNotFoundError(projectId));

            await expect(sut.delete(namespaceId, projectId)).rejects.toThrow(`Project ${projectId} not found`);
        });

        it('propagates errors that no translation covers', async () => {
            const error = new Error('db unreachable');
            mockProjectsService.delete.mockRejectedValue(error);

            await expect(sut.delete(namespaceId, projectId)).rejects.toBe(error);
        });
    });

    describe('telemetry event enrichment', () => {
        it('adds the namespace id of a list', async () => {
            mockProjectsService.getAll.mockResolvedValue([project]);

            const event = await runWithTelemetry({}, async () => {
                await sut.getAll(namespaceId);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'namespace.id': namespaceId });
        });

        it('adds the namespace and project ids of a read', async () => {
            mockProjectsService.findById.mockResolvedValue(project);

            const event = await runWithTelemetry({}, async () => {
                await sut.findById(namespaceId, projectId);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'namespace.id': namespaceId, 'project.id': projectId });
        });

        it('adds the namespace and project ids of a delete', async () => {
            mockProjectsService.delete.mockResolvedValue(true);

            const event = await runWithTelemetry({}, async () => {
                await sut.delete(namespaceId, projectId);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'namespace.id': namespaceId, 'project.id': projectId });
        });

        it('adds the ids even when the project does not exist', async () => {
            mockProjectsService.findById.mockRejectedValue(new ProjectNotFoundError(projectId));

            const event = await runWithTelemetry({}, async () => {
                await expect(sut.findById(namespaceId, projectId)).rejects.toBeInstanceOf(NotFoundException);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'namespace.id': namespaceId, 'project.id': projectId });
        });
    });
});
