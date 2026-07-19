import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { getContainersByServiceUseCase } from '../../../application/get-containers-by-service.use-case';
import { Container } from '../../../domain/models/container.model';
import { DockerContainersRepository } from '../../../infrastructure/docker/docker-containers.repository';
import { ContainersService } from '../containers.service';

import { Service } from '@features/services/domain/models/service.model';
import { ServicesDatabaseRepository } from '@features/services/infrastructure/database/services-db.repository';

jest.mock('../../../application/get-containers-by-service.use-case');

const mockGetContainersByServiceUseCase = getContainersByServiceUseCase as jest.MockedFunction<
    typeof getContainersByServiceUseCase
>;

const serviceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const service: Service = {
    id: serviceId,
    name: 'web-frontend',
    projectId: 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60',
    repositoryId: '42',
    deploymentBranch: 'main',
    composerPath: 'docker-compose.yml',
};

const containers: Container[] = [
    {
        id: 'a1b2c3d4e5f6',
        name: 'web-frontend-app-1',
        image: 'web-frontend_app',
        state: 'running',
        status: 'Up 3 minutes',
        createdAt: new Date('2026-07-11T00:00:00.000Z'),
        ports: [{ privatePort: 3000, publicPort: 8080, type: 'tcp' }],
    },
];

describe('ContainersService', () => {
    let mockServicesRepository: jest.Mocked<Pick<ServicesDatabaseRepository, 'findById'>>;
    let mockContainersRepository: jest.Mocked<Pick<DockerContainersRepository, 'listByService'>>;
    let sut: ContainersService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockServicesRepository = { findById: jest.fn() };
        mockContainersRepository = { listByService: jest.fn() };

        const moduleRef = await Test.createTestingModule({
            providers: [
                ContainersService,
                { provide: ServicesDatabaseRepository, useValue: mockServicesRepository },
                { provide: DockerContainersRepository, useValue: mockContainersRepository },
            ],
        }).compile();

        sut = moduleRef.get(ContainersService);
    });

    describe('getByService', () => {
        it('looks the service up by its id before listing containers', async () => {
            mockServicesRepository.findById.mockResolvedValue(service);
            mockGetContainersByServiceUseCase.mockResolvedValue(containers);

            await sut.getByService(serviceId);

            expect(mockServicesRepository.findById).toHaveBeenCalledTimes(1);
            expect(mockServicesRepository.findById).toHaveBeenCalledWith(serviceId);
        });

        it('delegates to the use case with the containers repository and the resolved service', async () => {
            mockServicesRepository.findById.mockResolvedValue(service);
            mockGetContainersByServiceUseCase.mockResolvedValue(containers);

            await sut.getByService(serviceId);

            expect(mockGetContainersByServiceUseCase).toHaveBeenCalledTimes(1);
            expect(mockGetContainersByServiceUseCase).toHaveBeenCalledWith(mockContainersRepository, service);
        });

        it('returns the containers produced by the use case', async () => {
            mockServicesRepository.findById.mockResolvedValue(service);
            mockGetContainersByServiceUseCase.mockResolvedValue(containers);

            const result = await sut.getByService(serviceId);

            expect(result).toBe(containers);
        });

        it('returns an empty list when the service has no containers', async () => {
            mockServicesRepository.findById.mockResolvedValue(service);
            mockGetContainersByServiceUseCase.mockResolvedValue([]);

            const result = await sut.getByService(serviceId);

            expect(result).toEqual([]);
        });

        it('throws NotFoundException when the service does not exist', async () => {
            mockServicesRepository.findById.mockResolvedValue(null);

            await expect(sut.getByService(serviceId)).rejects.toThrow(NotFoundException);
            await expect(sut.getByService(serviceId)).rejects.toThrow(`Service ${serviceId} not found`);
        });

        it('never invokes the use case when the service is missing', async () => {
            mockServicesRepository.findById.mockResolvedValue(null);

            await expect(sut.getByService(serviceId)).rejects.toThrow(NotFoundException);
            expect(mockGetContainersByServiceUseCase).not.toHaveBeenCalled();
        });

        it('propagates errors thrown while resolving the service', async () => {
            const error = new Error('db unreachable');
            mockServicesRepository.findById.mockRejectedValue(error);

            await expect(sut.getByService(serviceId)).rejects.toThrow(error);
            expect(mockGetContainersByServiceUseCase).not.toHaveBeenCalled();
        });

        it('propagates errors thrown while listing the containers', async () => {
            const error = new Error('daemon unreachable');
            mockServicesRepository.findById.mockResolvedValue(service);
            mockGetContainersByServiceUseCase.mockRejectedValue(error);

            await expect(sut.getByService(serviceId)).rejects.toThrow(error);
        });
    });
});
