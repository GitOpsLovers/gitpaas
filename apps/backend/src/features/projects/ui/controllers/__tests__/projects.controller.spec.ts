import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { CreateProjectDto } from '../../../domain/dtos/create-project.dto';
import { UpdateProjectDto } from '../../../domain/dtos/update-project.dto';
import { Project } from '../../../domain/models/project.model';
import { ProjectsService } from '../../services/projects.service';
import { ProjectsController } from '../projects.controller';

const projectId = 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60';

const project: Project = {
    id: projectId,
    name: 'platform',
    servicesCount: 3,
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

    describe('getAll', () => {
        it('delegates to the service', async () => {
            mockProjectsService.getAll.mockResolvedValue([project]);

            await sut.getAll();

            expect(mockProjectsService.getAll).toHaveBeenCalledTimes(1);
            expect(mockProjectsService.getAll).toHaveBeenCalledWith();
        });

        it('returns the projects produced by the service', async () => {
            mockProjectsService.getAll.mockResolvedValue([project]);

            const result = await sut.getAll();

            expect(result).toEqual([project]);
        });

        it('returns an empty list when the service has no projects', async () => {
            mockProjectsService.getAll.mockResolvedValue([]);

            const result = await sut.getAll();

            expect(result).toEqual([]);
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('db unreachable');
            mockProjectsService.getAll.mockRejectedValue(error);

            await expect(sut.getAll()).rejects.toBe(error);
        });
    });

    describe('findById', () => {
        it('delegates to the service with the received id', async () => {
            mockProjectsService.findById.mockResolvedValue(project);

            await sut.findById(projectId);

            expect(mockProjectsService.findById).toHaveBeenCalledTimes(1);
            expect(mockProjectsService.findById).toHaveBeenCalledWith(projectId);
        });

        it('returns the project produced by the service', async () => {
            mockProjectsService.findById.mockResolvedValue(project);

            const result = await sut.findById(projectId);

            expect(result).toBe(project);
        });

        it('throws a NotFoundException when the project does not exist', async () => {
            mockProjectsService.findById.mockResolvedValue(null);

            await expect(sut.findById(projectId)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('includes the id in the not-found message', async () => {
            mockProjectsService.findById.mockResolvedValue(null);

            await expect(sut.findById(projectId)).rejects.toThrow(`Project ${projectId} not found`);
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('db unreachable');
            mockProjectsService.findById.mockRejectedValue(error);

            await expect(sut.findById(projectId)).rejects.toBe(error);
        });
    });

    describe('create', () => {
        const createDto: CreateProjectDto = { name: 'platform' };

        it('delegates to the service with the received dto', async () => {
            mockProjectsService.create.mockResolvedValue(project);

            await sut.create(createDto);

            expect(mockProjectsService.create).toHaveBeenCalledTimes(1);
            expect(mockProjectsService.create).toHaveBeenCalledWith(createDto);
        });

        it('returns the created project', async () => {
            mockProjectsService.create.mockResolvedValue(project);

            const result = await sut.create(createDto);

            expect(result).toBe(project);
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('name already taken');
            mockProjectsService.create.mockRejectedValue(error);

            await expect(sut.create(createDto)).rejects.toBe(error);
        });
    });

    describe('update', () => {
        const updateDto: UpdateProjectDto = { name: 'renamed' };

        it('delegates to the service with the received id and dto', async () => {
            mockProjectsService.update.mockResolvedValue(project);

            await sut.update(projectId, updateDto);

            expect(mockProjectsService.update).toHaveBeenCalledTimes(1);
            expect(mockProjectsService.update).toHaveBeenCalledWith(projectId, updateDto);
        });

        it('returns the updated project produced by the service', async () => {
            const updated: Project = { ...project, name: 'renamed' };
            mockProjectsService.update.mockResolvedValue(updated);

            const result = await sut.update(projectId, updateDto);

            expect(result).toBe(updated);
        });

        it('throws a NotFoundException when the project does not exist', async () => {
            mockProjectsService.update.mockResolvedValue(null);

            await expect(sut.update(projectId, updateDto)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('includes the id in the not-found message', async () => {
            mockProjectsService.update.mockResolvedValue(null);

            await expect(sut.update(projectId, updateDto)).rejects.toThrow(
                `Project ${projectId} not found`,
            );
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('db unreachable');
            mockProjectsService.update.mockRejectedValue(error);

            await expect(sut.update(projectId, updateDto)).rejects.toBe(error);
        });
    });

    describe('delete', () => {
        it('delegates to the service with the received id', async () => {
            mockProjectsService.delete.mockResolvedValue(true);

            await sut.delete(projectId);

            expect(mockProjectsService.delete).toHaveBeenCalledTimes(1);
            expect(mockProjectsService.delete).toHaveBeenCalledWith(projectId);
        });

        it('resolves with no value when a row was deleted', async () => {
            mockProjectsService.delete.mockResolvedValue(true);

            await expect(sut.delete(projectId)).resolves.toBeUndefined();
        });

        it('throws a NotFoundException when nothing was deleted', async () => {
            mockProjectsService.delete.mockResolvedValue(false);

            await expect(sut.delete(projectId)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('includes the id in the not-found message', async () => {
            mockProjectsService.delete.mockResolvedValue(false);

            await expect(sut.delete(projectId)).rejects.toThrow(`Project ${projectId} not found`);
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('db unreachable');
            mockProjectsService.delete.mockRejectedValue(error);

            await expect(sut.delete(projectId)).rejects.toBe(error);
        });
    });
});
