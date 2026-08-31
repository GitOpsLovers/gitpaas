import type { CreateServiceDto, Service as ServiceResponse, UpdateServiceDto } from '@gitpaas/contracts';
import { NotFoundException, ParseUUIDPipe } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';

import { Service } from '../../../domain/models/service.models';
import { ServicesService } from '../../services/services.service';
import { ServicesController } from '../services.controller';

import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { ZodValidationPipe } from '@core/ui/pipes/zod-validation.pipe';
import { ProjectNotFoundError } from '@features/projects/domain/errors/project.errors';
import { ProviderNotFoundError } from '@features/providers/domain/errors/provider.errors';

const serviceId = 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90';
const projectId = 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60';
const providerId = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f';

const service: Service = {
    id: serviceId,
    name: 'api-gateway',
    description: 'The gateway of the API',
    projectId,
    providerId,
    repositoryId: '42',
    deploymentBranch: 'main',
    composerPath: 'docker-compose.yml',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

/** The shape the controller must answer with for `service`. */
const serviceResponse: ServiceResponse = {
    id: serviceId,
    name: 'api-gateway',
    description: 'The gateway of the API',
    projectId,
    providerId,
    repositoryId: '42',
    deploymentBranch: 'main',
    composerPath: 'docker-compose.yml',
    createdAt: '2026-01-01T00:00:00.000Z',
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
 * Reads the pipes the controller declares for one bound argument of a handler.
 *
 * The pipes themselves are framework mechanics that the unit specs never run, so
 * this reads the declaration instead: dropping a pipe would let an unchecked
 * value reach the service, and must fail a test.
 *
 * Every path parameter and every query parameter carries its name in `data`, so
 * the body is the one bound argument that carries none.
 */
const pipesFor = (handler: string, parameter?: string): unknown[] => {
    // eslint-disable-next-line operator-linebreak
    const metadata =
        (Reflect.getMetadata(ROUTE_ARGS_METADATA, ServicesController, handler) as Record<
            string,
            RouteArgMetadata
        >) ?? {};

    return Object.values(metadata).find((argument) => argument.data === parameter)?.pipes ?? [];
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

    describe('parameter validation', () => {
        it.each(['findById', 'update', 'delete'])(
            'validates the id path parameter of %s as a UUID',
            (handler) => {
                expect(pipesFor(handler, 'id')).toContain(ParseUUIDPipe);
            },
        );

        it('validates the projectId query parameter of getAllByProject as a UUID', () => {
            expect(pipesFor('getAllByProject', 'projectId')).toContain(ParseUUIDPipe);
        });

        it.each(['create', 'update'])('validates the body of %s with a Zod pipe', (handler) => {
            expect(pipesFor(handler)).toEqual([expect.any(ZodValidationPipe)]);
        });

        it.each(['getAllByProject', 'findById', 'delete'])('never binds a body on %s', (handler) => {
            expect(pipesFor(handler)).toEqual([]);
        });
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

            expect(result).toEqual([serviceResponse]);
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

            expect(result).toEqual(serviceResponse);
        });

        it('answers with the date of creation as a text of the ISO form, and never as a Date', async () => {
            mockServicesService.findById.mockResolvedValue(service);

            const result = await sut.findById(serviceId);

            expect(result.createdAt).toBe('2026-01-01T00:00:00.000Z');
            expect(result.createdAt).not.toBeInstanceOf(Date);
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
        const createDto: CreateServiceDto = { name: 'api-gateway', projectId, providerId };

        it('delegates to the service with the received dto', async () => {
            mockServicesService.create.mockResolvedValue(service);

            await sut.create(createDto);

            expect(mockServicesService.create).toHaveBeenCalledTimes(1);
            expect(mockServicesService.create).toHaveBeenCalledWith(createDto);
        });

        it('returns the created service', async () => {
            mockServicesService.create.mockResolvedValue(service);

            const result = await sut.create(createDto);

            expect(result).toEqual(serviceResponse);
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('name already taken');
            mockServicesService.create.mockRejectedValue(error);

            await expect(sut.create(createDto)).rejects.toBe(error);
        });

        it('creates a service from a body that holds no provider', async () => {
            const dtoWithoutProvider: CreateServiceDto = { name: 'api-gateway', projectId };
            const serviceWithoutProvider: Service = { ...service, providerId: null };
            mockServicesService.create.mockResolvedValue(serviceWithoutProvider);

            const result = await sut.create(dtoWithoutProvider);

            expect(mockServicesService.create).toHaveBeenCalledWith(dtoWithoutProvider);
            expect(result).toEqual({ ...serviceResponse, providerId: null });
        });

        it('translates a ProviderNotFoundError into a NotFoundException', async () => {
            mockServicesService.create.mockRejectedValue(new ProviderNotFoundError(providerId));

            await expect(sut.create(createDto)).rejects.toBeInstanceOf(NotFoundException);
            await expect(sut.create(createDto)).rejects.toThrow(`Provider ${providerId} not found`);
        });

        it('translates a ProjectNotFoundError into a NotFoundException', async () => {
            mockServicesService.create.mockRejectedValue(new ProjectNotFoundError(projectId));

            await expect(sut.create(createDto)).rejects.toBeInstanceOf(NotFoundException);
            await expect(sut.create(createDto)).rejects.toThrow(`Project ${projectId} not found`);
        });

        it('chains the domain error as the cause, so the envelope publishes its code', async () => {
            const domainError = new ProjectNotFoundError(projectId);
            mockServicesService.create.mockRejectedValue(domainError);

            const error = await sut.create(createDto).catch((caught: unknown) => caught);

            expect((error as Error).cause).toBe(domainError);
        });

        it('rethrows an HttpException raised by the service unchanged', async () => {
            const original = new NotFoundException('gone');
            mockServicesService.create.mockRejectedValue(original);

            await expect(sut.create(createDto)).rejects.toBe(original);
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

            expect(result).toEqual({ ...serviceResponse, name: 'renamed' });
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

    describe('telemetry event enrichment', () => {
        it('adds the project id of a listing', async () => {
            mockServicesService.getAllByProject.mockResolvedValue([service]);

            const event = await runWithTelemetry({}, async () => {
                await sut.getAllByProject(projectId);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'project.id': projectId });
        });

        it('adds the service id of a read', async () => {
            mockServicesService.findById.mockResolvedValue(service);

            const event = await runWithTelemetry({}, async () => {
                await sut.findById(serviceId);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'service.id': serviceId });
        });

        it('adds the service id of a delete', async () => {
            mockServicesService.delete.mockResolvedValue(true);

            const event = await runWithTelemetry({}, async () => {
                await sut.delete(serviceId);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'service.id': serviceId });
        });
    });
});
