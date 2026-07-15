import { NotFoundException } from '@nestjs/common';

import { CreateProjectDto } from '../../../domain/dtos/create-project.dto';
import { UpdateProjectDto } from '../../../domain/dtos/update-project.dto';
import { Project } from '../../../domain/models/project.model';
import { ProjectsService } from '../../services/projects.service';
import { ProjectsController } from '../projects.controller';

jest.mock('@features/providers/infrastructure/github/github-app.provider', () => ({
    GithubAppProvider: class GithubAppProvider {},
}));

const projectId = 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60';

const project: Project = {
    id: projectId,
    name: 'platform',
    servicesCount: 3,
};

describe('ProjectsController', () => {
    let service: jest.Mocked<
        Pick<ProjectsService, 'getAll' | 'findById' | 'create' | 'update' | 'delete'>
    >;
    let sut: ProjectsController;

    beforeEach(() => {
        service = {
            getAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };

        sut = new ProjectsController(service as unknown as ProjectsService);
    });

    describe('getAll', () => {
        it('delegates to the service', async () => {
            service.getAll.mockResolvedValue([project]);

            await sut.getAll();

            expect(service.getAll).toHaveBeenCalledTimes(1);
            expect(service.getAll).toHaveBeenCalledWith();
        });

        it('returns the projects produced by the service', async () => {
            service.getAll.mockResolvedValue([project]);

            const result = await sut.getAll();

            expect(result).toEqual([project]);
        });

        it('returns an empty list when the service has no projects', async () => {
            service.getAll.mockResolvedValue([]);

            const result = await sut.getAll();

            expect(result).toEqual([]);
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('db unreachable');
            service.getAll.mockRejectedValue(error);

            await expect(sut.getAll()).rejects.toBe(error);
        });
    });

    describe('findById', () => {
        it('delegates to the service with the received id', async () => {
            service.findById.mockResolvedValue(project);

            await sut.findById(projectId);

            expect(service.findById).toHaveBeenCalledTimes(1);
            expect(service.findById).toHaveBeenCalledWith(projectId);
        });

        it('returns the project produced by the service', async () => {
            service.findById.mockResolvedValue(project);

            const result = await sut.findById(projectId);

            expect(result).toBe(project);
        });

        it('throws a NotFoundException when the project does not exist', async () => {
            service.findById.mockResolvedValue(null);

            await expect(sut.findById(projectId)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('includes the id in the not-found message', async () => {
            service.findById.mockResolvedValue(null);

            await expect(sut.findById(projectId)).rejects.toThrow(`Project ${projectId} not found`);
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('db unreachable');
            service.findById.mockRejectedValue(error);

            await expect(sut.findById(projectId)).rejects.toBe(error);
        });
    });

    describe('create', () => {
        const createDto: CreateProjectDto = { name: 'platform' };

        it('delegates to the service with the received dto', async () => {
            service.create.mockResolvedValue(project);

            await sut.create(createDto);

            expect(service.create).toHaveBeenCalledTimes(1);
            expect(service.create).toHaveBeenCalledWith(createDto);
        });

        it('returns the created project', async () => {
            service.create.mockResolvedValue(project);

            const result = await sut.create(createDto);

            expect(result).toBe(project);
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('name already taken');
            service.create.mockRejectedValue(error);

            await expect(sut.create(createDto)).rejects.toBe(error);
        });
    });

    describe('update', () => {
        const updateDto: UpdateProjectDto = { name: 'renamed' };

        it('delegates to the service with the received id and dto', async () => {
            service.update.mockResolvedValue(project);

            await sut.update(projectId, updateDto);

            expect(service.update).toHaveBeenCalledTimes(1);
            expect(service.update).toHaveBeenCalledWith(projectId, updateDto);
        });

        it('returns the updated project produced by the service', async () => {
            const updated: Project = { ...project, name: 'renamed' };
            service.update.mockResolvedValue(updated);

            const result = await sut.update(projectId, updateDto);

            expect(result).toBe(updated);
        });

        it('throws a NotFoundException when the project does not exist', async () => {
            service.update.mockResolvedValue(null);

            await expect(sut.update(projectId, updateDto)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('includes the id in the not-found message', async () => {
            service.update.mockResolvedValue(null);

            await expect(sut.update(projectId, updateDto)).rejects.toThrow(
                `Project ${projectId} not found`,
            );
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('db unreachable');
            service.update.mockRejectedValue(error);

            await expect(sut.update(projectId, updateDto)).rejects.toBe(error);
        });
    });

    describe('delete', () => {
        it('delegates to the service with the received id', async () => {
            service.delete.mockResolvedValue(true);

            await sut.delete(projectId);

            expect(service.delete).toHaveBeenCalledTimes(1);
            expect(service.delete).toHaveBeenCalledWith(projectId);
        });

        it('resolves with no value when a row was deleted', async () => {
            service.delete.mockResolvedValue(true);

            await expect(sut.delete(projectId)).resolves.toBeUndefined();
        });

        it('throws a NotFoundException when nothing was deleted', async () => {
            service.delete.mockResolvedValue(false);

            await expect(sut.delete(projectId)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('includes the id in the not-found message', async () => {
            service.delete.mockResolvedValue(false);

            await expect(sut.delete(projectId)).rejects.toThrow(`Project ${projectId} not found`);
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('db unreachable');
            service.delete.mockRejectedValue(error);

            await expect(sut.delete(projectId)).rejects.toBe(error);
        });
    });
});
