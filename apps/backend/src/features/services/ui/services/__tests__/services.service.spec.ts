import { Test } from '@nestjs/testing';

import { createServiceUseCase } from '../../../application/create-service.use-case';
import { deleteServiceUseCase } from '../../../application/delete-service.use-case';
import { findServiceByIdUseCase } from '../../../application/find-service-by-id.use-case';
import { getServicesByProjectUseCase } from '../../../application/get-services-by-project.use-case';
import { updateServiceUseCase } from '../../../application/update-service.use-case';
import { CreateServiceDto } from '../../../domain/dtos/create-service.dto';
import { UpdateServiceDto } from '../../../domain/dtos/update-service.dto';
import { Service } from '../../../domain/models/service.model';
import { ServicesDatabaseRepository } from '../../../infrastructure/database/services-db.repository';
import { ServicesService } from '../services.service';

jest.mock('../../../application/create-service.use-case');
jest.mock('../../../application/delete-service.use-case');
jest.mock('../../../application/find-service-by-id.use-case');
jest.mock('../../../application/get-services-by-project.use-case');
jest.mock('../../../application/update-service.use-case');

const createServiceUseCaseMock = createServiceUseCase as jest.MockedFunction<
    typeof createServiceUseCase
>;
const deleteServiceUseCaseMock = deleteServiceUseCase as jest.MockedFunction<
    typeof deleteServiceUseCase
>;
const findServiceByIdUseCaseMock = findServiceByIdUseCase as jest.MockedFunction<
    typeof findServiceByIdUseCase
>;
const getServicesByProjectUseCaseMock = getServicesByProjectUseCase as jest.MockedFunction<
    typeof getServicesByProjectUseCase
>;
const updateServiceUseCaseMock = updateServiceUseCase as jest.MockedFunction<
    typeof updateServiceUseCase
>;

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

describe('ServicesService', () => {
    let repository: jest.Mocked<ServicesDatabaseRepository>;
    let sut: ServicesService;

    beforeEach(async () => {
        jest.clearAllMocks();

        repository = {} as jest.Mocked<ServicesDatabaseRepository>;

        const moduleRef = await Test.createTestingModule({
            providers: [
                ServicesService,
                { provide: ServicesDatabaseRepository, useValue: repository },
            ],
        }).compile();

        sut = moduleRef.get(ServicesService);
    });

    describe('getAllByProject', () => {
        it('delegates to the use case with the repository and project id', async () => {
            getServicesByProjectUseCaseMock.mockResolvedValue([service]);

            await sut.getAllByProject(projectId);

            expect(getServicesByProjectUseCaseMock).toHaveBeenCalledTimes(1);
            expect(getServicesByProjectUseCaseMock).toHaveBeenCalledWith(repository, projectId);
        });

        it('returns the services produced by the use case', async () => {
            getServicesByProjectUseCaseMock.mockResolvedValue([service]);

            const result = await sut.getAllByProject(projectId);

            expect(result).toEqual([service]);
        });

        it('returns an empty list when the project has no services', async () => {
            getServicesByProjectUseCaseMock.mockResolvedValue([]);

            const result = await sut.getAllByProject(projectId);

            expect(result).toEqual([]);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            getServicesByProjectUseCaseMock.mockRejectedValue(error);

            await expect(sut.getAllByProject(projectId)).rejects.toThrow(error);
        });
    });

    describe('findById', () => {
        it('delegates to the use case with the repository and id', async () => {
            findServiceByIdUseCaseMock.mockResolvedValue(service);

            await sut.findById(serviceId);

            expect(findServiceByIdUseCaseMock).toHaveBeenCalledTimes(1);
            expect(findServiceByIdUseCaseMock).toHaveBeenCalledWith(repository, serviceId);
        });

        it('returns the service produced by the use case', async () => {
            findServiceByIdUseCaseMock.mockResolvedValue(service);

            const result = await sut.findById(serviceId);

            expect(result).toBe(service);
        });

        it('returns null when the service does not exist', async () => {
            findServiceByIdUseCaseMock.mockResolvedValue(null);

            const result = await sut.findById(serviceId);

            expect(result).toBeNull();
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            findServiceByIdUseCaseMock.mockRejectedValue(error);

            await expect(sut.findById(serviceId)).rejects.toThrow(error);
        });
    });

    describe('create', () => {
        const createDto: CreateServiceDto = { name: 'api-gateway', projectId };

        it('delegates to the use case with the repository and the dto', async () => {
            createServiceUseCaseMock.mockResolvedValue(service);

            await sut.create(createDto);

            expect(createServiceUseCaseMock).toHaveBeenCalledTimes(1);
            expect(createServiceUseCaseMock).toHaveBeenCalledWith(repository, createDto);
        });

        it('returns the created service', async () => {
            createServiceUseCaseMock.mockResolvedValue(service);

            const result = await sut.create(createDto);

            expect(result).toBe(service);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('name already taken');
            createServiceUseCaseMock.mockRejectedValue(error);

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
            updateServiceUseCaseMock.mockResolvedValue(service);

            await sut.update(serviceId, updateDto);

            expect(updateServiceUseCaseMock).toHaveBeenCalledTimes(1);
            expect(updateServiceUseCaseMock).toHaveBeenCalledWith(repository, serviceId, updateDto);
        });

        it('returns the updated service', async () => {
            const updated: Service = { ...service, name: 'renamed' };
            updateServiceUseCaseMock.mockResolvedValue(updated);

            const result = await sut.update(serviceId, updateDto);

            expect(result).toBe(updated);
        });

        it('returns null when the service does not exist', async () => {
            updateServiceUseCaseMock.mockResolvedValue(null);

            const result = await sut.update(serviceId, updateDto);

            expect(result).toBeNull();
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            updateServiceUseCaseMock.mockRejectedValue(error);

            await expect(sut.update(serviceId, updateDto)).rejects.toThrow(error);
        });
    });

    describe('delete', () => {
        it('delegates to the use case with the repository and id', async () => {
            deleteServiceUseCaseMock.mockResolvedValue(true);

            await sut.delete(serviceId);

            expect(deleteServiceUseCaseMock).toHaveBeenCalledTimes(1);
            expect(deleteServiceUseCaseMock).toHaveBeenCalledWith(repository, serviceId);
        });

        it('returns true when a row was deleted', async () => {
            deleteServiceUseCaseMock.mockResolvedValue(true);

            const result = await sut.delete(serviceId);

            expect(result).toBe(true);
        });

        it('returns false when nothing was deleted', async () => {
            deleteServiceUseCaseMock.mockResolvedValue(false);

            const result = await sut.delete(serviceId);

            expect(result).toBe(false);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            deleteServiceUseCaseMock.mockRejectedValue(error);

            await expect(sut.delete(serviceId)).rejects.toThrow(error);
        });
    });
});
