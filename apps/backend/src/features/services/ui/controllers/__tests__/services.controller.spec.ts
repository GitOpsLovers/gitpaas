import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { CreateServiceDto } from '../../../domain/dtos/create-service.dto';
import { UpdateServiceDto } from '../../../domain/dtos/update-service.dto';
import { Service } from '../../../domain/models/service.model';
import { ServicesService } from '../../services/services.service';
import { ServicesController } from '../services.controller';

const serviceId = 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90';
const projectId = 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60';

const service: Service = {
    id: serviceId,
    name: 'api-gateway',
    projectId,
    repositoryId: '42',
    deploymentBranch: 'main',
    composerPath: 'docker-compose.yml',
};

describe('ServicesController', () => {
    let mockServicesService: jest.Mocked<
        Pick<ServicesService, 'getAllByProject' | 'findById' | 'create' | 'update' | 'delete'>
    >;
    let sut: ServicesController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockServicesService = {
            getAllByProject: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [ServicesController],
            providers: [
                { provide: ServicesService, useValue: mockServicesService },
            ],
        }).compile();

        sut = moduleRef.get(ServicesController);
    });

    describe('getAllByProject', () => {
        it('delegates to the service with the received project id', async () => {
            mockServicesService.getAllByProject.mockResolvedValue([service]);

            await sut.getAllByProject(projectId);

            expect(mockServicesService.getAllByProject).toHaveBeenCalledTimes(1);
            expect(mockServicesService.getAllByProject).toHaveBeenCalledWith(projectId);
        });

        it('returns the services produced by the service', async () => {
            mockServicesService.getAllByProject.mockResolvedValue([service]);

            const result = await sut.getAllByProject(projectId);

            expect(result).toEqual([service]);
        });

        it('returns an empty list when the project has no services', async () => {
            mockServicesService.getAllByProject.mockResolvedValue([]);

            const result = await sut.getAllByProject(projectId);

            expect(result).toEqual([]);
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('db unreachable');
            mockServicesService.getAllByProject.mockRejectedValue(error);

            await expect(sut.getAllByProject(projectId)).rejects.toBe(error);
        });
    });

    describe('findById', () => {
        it('delegates to the service with the received id', async () => {
            mockServicesService.findById.mockResolvedValue(service);

            await sut.findById(serviceId);

            expect(mockServicesService.findById).toHaveBeenCalledTimes(1);
            expect(mockServicesService.findById).toHaveBeenCalledWith(serviceId);
        });

        it('returns the service produced by the service', async () => {
            mockServicesService.findById.mockResolvedValue(service);

            const result = await sut.findById(serviceId);

            expect(result).toBe(service);
        });

        it('throws a NotFoundException when the service does not exist', async () => {
            mockServicesService.findById.mockResolvedValue(null);

            await expect(sut.findById(serviceId)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('includes the id in the not-found message', async () => {
            mockServicesService.findById.mockResolvedValue(null);

            await expect(sut.findById(serviceId)).rejects.toThrow(`Service ${serviceId} not found`);
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('db unreachable');
            mockServicesService.findById.mockRejectedValue(error);

            await expect(sut.findById(serviceId)).rejects.toBe(error);
        });
    });

    describe('create', () => {
        const createDto: CreateServiceDto = { name: 'api-gateway', projectId };

        it('delegates to the service with the received dto', async () => {
            mockServicesService.create.mockResolvedValue(service);

            await sut.create(createDto);

            expect(mockServicesService.create).toHaveBeenCalledTimes(1);
            expect(mockServicesService.create).toHaveBeenCalledWith(createDto);
        });

        it('returns the created service', async () => {
            mockServicesService.create.mockResolvedValue(service);

            const result = await sut.create(createDto);

            expect(result).toBe(service);
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('name already taken');
            mockServicesService.create.mockRejectedValue(error);

            await expect(sut.create(createDto)).rejects.toBe(error);
        });
    });

    describe('update', () => {
        const updateDto: UpdateServiceDto = {
            name: 'renamed',
            repositoryId: '99',
            deploymentBranch: 'develop',
            composerPath: 'compose/prod.yml',
        };

        it('delegates to the service with the received id and dto', async () => {
            mockServicesService.update.mockResolvedValue(service);

            await sut.update(serviceId, updateDto);

            expect(mockServicesService.update).toHaveBeenCalledTimes(1);
            expect(mockServicesService.update).toHaveBeenCalledWith(serviceId, updateDto);
        });

        it('returns the updated service produced by the service', async () => {
            const updated: Service = { ...service, name: 'renamed' };
            mockServicesService.update.mockResolvedValue(updated);

            const result = await sut.update(serviceId, updateDto);

            expect(result).toBe(updated);
        });

        it('throws a NotFoundException when the service does not exist', async () => {
            mockServicesService.update.mockResolvedValue(null);

            await expect(sut.update(serviceId, updateDto)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('includes the id in the not-found message', async () => {
            mockServicesService.update.mockResolvedValue(null);

            await expect(sut.update(serviceId, updateDto)).rejects.toThrow(
                `Service ${serviceId} not found`,
            );
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('db unreachable');
            mockServicesService.update.mockRejectedValue(error);

            await expect(sut.update(serviceId, updateDto)).rejects.toBe(error);
        });
    });

    describe('delete', () => {
        it('delegates to the service with the received id', async () => {
            mockServicesService.delete.mockResolvedValue(true);

            await sut.delete(serviceId);

            expect(mockServicesService.delete).toHaveBeenCalledTimes(1);
            expect(mockServicesService.delete).toHaveBeenCalledWith(serviceId);
        });

        it('resolves with no value when a row was deleted', async () => {
            mockServicesService.delete.mockResolvedValue(true);

            await expect(sut.delete(serviceId)).resolves.toBeUndefined();
        });

        it('throws a NotFoundException when nothing was deleted', async () => {
            mockServicesService.delete.mockResolvedValue(false);

            await expect(sut.delete(serviceId)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('includes the id in the not-found message', async () => {
            mockServicesService.delete.mockResolvedValue(false);

            await expect(sut.delete(serviceId)).rejects.toThrow(`Service ${serviceId} not found`);
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('db unreachable');
            mockServicesService.delete.mockRejectedValue(error);

            await expect(sut.delete(serviceId)).rejects.toBe(error);
        });
    });
});
