import type { CreateServiceDto, UpdateServiceDto } from '@gitpaas/contracts';
import { Test } from '@nestjs/testing';

import { createServiceUseCase } from '../../../application/create-service.use-case';
import { deleteServiceUseCase } from '../../../application/delete-service.use-case';
import { findServiceByIdUseCase } from '../../../application/find-service-by-id.use-case';
import { getServicesByProjectUseCase } from '../../../application/get-services-by-project.use-case';
import { updateServiceUseCase } from '../../../application/update-service.use-case';
import { Service } from '../../../domain/models/service.models';
import { DatabaseServicesRepository } from '../../../infrastructure/database/db-services.repository';
import { DockerServiceRuntimeResourcesAdapter } from '../../../infrastructure/docker/docker-service-runtime-resources.adapter';
import { ServicesService } from '../services.service';

import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { DatabaseDeploymentsRepository } from '@features/deployments/infrastructure/database/db-deployments.repository';
import { RedisLogStoreAdapter } from '@features/logs/infrastructure/redis/redis-log-store.adapter';

jest.mock('../../../application/create-service.use-case');
jest.mock('../../../application/delete-service.use-case');
jest.mock('../../../application/find-service-by-id.use-case');
jest.mock('../../../application/get-services-by-project.use-case');
jest.mock('../../../application/update-service.use-case');

const mockCreateServiceUseCase = createServiceUseCase as jest.MockedFunction<
    typeof createServiceUseCase
>;
const mockDeleteServiceUseCase = deleteServiceUseCase as jest.MockedFunction<
    typeof deleteServiceUseCase
>;
const mockFindServiceByIdUseCase = findServiceByIdUseCase as jest.MockedFunction<
    typeof findServiceByIdUseCase
>;
const mockGetServicesByProjectUseCase = getServicesByProjectUseCase as jest.MockedFunction<
    typeof getServicesByProjectUseCase
>;
const mockUpdateServiceUseCase = updateServiceUseCase as jest.MockedFunction<
    typeof updateServiceUseCase
>;

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

describe('ServicesService', () => {
    let mockServicesRepository: jest.Mocked<DatabaseServicesRepository>;
    let mockDeploymentsRepository: jest.Mocked<DatabaseDeploymentsRepository>;
    let mockServiceRuntimeResources: jest.Mocked<DockerServiceRuntimeResourcesAdapter>;
    let mockLogStore: jest.Mocked<RedisLogStoreAdapter>;
    let sut: ServicesService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockServicesRepository = {} as jest.Mocked<DatabaseServicesRepository>;
        mockDeploymentsRepository = {} as jest.Mocked<DatabaseDeploymentsRepository>;
        mockServiceRuntimeResources = {} as jest.Mocked<DockerServiceRuntimeResourcesAdapter>;
        mockLogStore = {} as jest.Mocked<RedisLogStoreAdapter>;

        const moduleRef = await Test.createTestingModule({
            providers: [
                ServicesService,
                { provide: DatabaseServicesRepository, useValue: mockServicesRepository },
                { provide: DatabaseDeploymentsRepository, useValue: mockDeploymentsRepository },
                { provide: DockerServiceRuntimeResourcesAdapter, useValue: mockServiceRuntimeResources },
                { provide: RedisLogStoreAdapter, useValue: mockLogStore },
            ],
        }).compile();

        sut = moduleRef.get(ServicesService);
    });

    describe('getAllByProject', () => {
        it('delegates to the use case with the repository and project id', async () => {
            mockGetServicesByProjectUseCase.mockResolvedValue([service]);

            await sut.getAllByProject(projectId);

            expect(mockGetServicesByProjectUseCase).toHaveBeenCalledTimes(1);
            expect(mockGetServicesByProjectUseCase).toHaveBeenCalledWith(mockServicesRepository, projectId);
        });

        it('returns the services produced by the use case', async () => {
            mockGetServicesByProjectUseCase.mockResolvedValue([service]);

            const result = await sut.getAllByProject(projectId);

            expect(result).toEqual([service]);
        });

        it('returns an empty list when the project has no services', async () => {
            mockGetServicesByProjectUseCase.mockResolvedValue([]);

            const result = await sut.getAllByProject(projectId);

            expect(result).toEqual([]);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            mockGetServicesByProjectUseCase.mockRejectedValue(error);

            await expect(sut.getAllByProject(projectId)).rejects.toThrow(error);
        });
    });

    describe('findById', () => {
        it('delegates to the use case with the repository and id', async () => {
            mockFindServiceByIdUseCase.mockResolvedValue(service);

            await sut.findById(serviceId);

            expect(mockFindServiceByIdUseCase).toHaveBeenCalledTimes(1);
            expect(mockFindServiceByIdUseCase).toHaveBeenCalledWith(mockServicesRepository, serviceId);
        });

        it('returns the service produced by the use case', async () => {
            mockFindServiceByIdUseCase.mockResolvedValue(service);

            const result = await sut.findById(serviceId);

            expect(result).toBe(service);
        });

        it('returns null when the service does not exist', async () => {
            mockFindServiceByIdUseCase.mockResolvedValue(null);

            const result = await sut.findById(serviceId);

            expect(result).toBeNull();
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            mockFindServiceByIdUseCase.mockRejectedValue(error);

            await expect(sut.findById(serviceId)).rejects.toThrow(error);
        });
    });

    describe('create', () => {
        const createDto: CreateServiceDto = { name: 'api-gateway', projectId, providerId };

        it('delegates to the use case with the repository and the dto', async () => {
            mockCreateServiceUseCase.mockResolvedValue(service);

            await sut.create(createDto);

            expect(mockCreateServiceUseCase).toHaveBeenCalledTimes(1);
            expect(mockCreateServiceUseCase).toHaveBeenCalledWith(mockServicesRepository, createDto);
        });

        it('returns the created service', async () => {
            mockCreateServiceUseCase.mockResolvedValue(service);

            const result = await sut.create(createDto);

            expect(result).toBe(service);
        });

        it('creates a service from a dto that names no provider', async () => {
            const dtoWithoutProvider: CreateServiceDto = { name: 'api-gateway', projectId };
            const serviceWithoutProvider: Service = { ...service, providerId: null };
            mockCreateServiceUseCase.mockResolvedValue(serviceWithoutProvider);

            const result = await sut.create(dtoWithoutProvider);

            expect(mockCreateServiceUseCase).toHaveBeenCalledWith(mockServicesRepository, dtoWithoutProvider);
            expect(result).toBe(serviceWithoutProvider);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('name already taken');
            mockCreateServiceUseCase.mockRejectedValue(error);

            await expect(sut.create(createDto)).rejects.toThrow(error);
        });
    });

    describe('update', () => {
        const updateDto: UpdateServiceDto = {
            name: 'renamed',
            repositoryId: '99',
            deploymentBranch: 'develop',
            composerPath: 'compose/prod.yml',
        };

        it('delegates to the use case with the repository, id and the dto', async () => {
            mockUpdateServiceUseCase.mockResolvedValue(service);

            await sut.update(serviceId, updateDto);

            expect(mockUpdateServiceUseCase).toHaveBeenCalledTimes(1);
            expect(mockUpdateServiceUseCase).toHaveBeenCalledWith(mockServicesRepository, serviceId, updateDto);
        });

        it('returns the updated service', async () => {
            const updated: Service = { ...service, name: 'renamed' };
            mockUpdateServiceUseCase.mockResolvedValue(updated);

            const result = await sut.update(serviceId, updateDto);

            expect(result).toBe(updated);
        });

        it('returns null when the service does not exist', async () => {
            mockUpdateServiceUseCase.mockResolvedValue(null);

            const result = await sut.update(serviceId, updateDto);

            expect(result).toBeNull();
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            mockUpdateServiceUseCase.mockRejectedValue(error);

            await expect(sut.update(serviceId, updateDto)).rejects.toThrow(error);
        });
    });

    describe('delete', () => {
        it('delegates to the use case with all collaborators and the id', async () => {
            mockDeleteServiceUseCase.mockResolvedValue(true);

            await sut.delete(serviceId);

            expect(mockDeleteServiceUseCase).toHaveBeenCalledTimes(1);
            expect(mockDeleteServiceUseCase).toHaveBeenCalledWith(
                mockServicesRepository,
                mockDeploymentsRepository,
                mockServiceRuntimeResources,
                mockLogStore,
                serviceId,
            );
        });

        it('returns true when a row was deleted', async () => {
            mockDeleteServiceUseCase.mockResolvedValue(true);

            const result = await sut.delete(serviceId);

            expect(result).toBe(true);
        });

        it('returns false when nothing was deleted', async () => {
            mockDeleteServiceUseCase.mockResolvedValue(false);

            const result = await sut.delete(serviceId);

            expect(result).toBe(false);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            mockDeleteServiceUseCase.mockRejectedValue(error);

            await expect(sut.delete(serviceId)).rejects.toThrow(error);
        });
    });

    describe('telemetry event enrichment', () => {
        it('adds the identifiers and the slug of the service it read', async () => {
            mockFindServiceByIdUseCase.mockResolvedValue(service);

            const event = await runWithTelemetry({}, async () => {
                await sut.findById(serviceId);

                return getTelemetry();
            });

            expect(event).toEqual({
                'service.id': serviceId,
                'service.slug': 'api-gateway',
                'project.id': projectId,
            });
        });

        it('adds the identifiers of the service it created', async () => {
            mockCreateServiceUseCase.mockResolvedValue(service);

            const event = await runWithTelemetry({}, async () => {
                await sut.create({
                    name: 'api-gateway',
                    projectId,
                    providerId,
                });

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'service.id': serviceId, 'project.id': projectId });
        });

        it('adds nothing when the service does not exist', async () => {
            mockUpdateServiceUseCase.mockResolvedValue(null);

            const event = await runWithTelemetry({}, async () => {
                await sut.update(serviceId, { name: 'renamed' });

                return getTelemetry();
            });

            expect(event).toEqual({});
        });
    });
});
