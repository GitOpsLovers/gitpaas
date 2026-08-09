import { HttpException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { getNetworksByServiceUseCase } from '../../../application/get-networks-by-service.use-case';
import { ServiceNotFoundError } from '../../../domain/errors/network.errors';
import { Network } from '../../../domain/models/network.models';
import { DockerNetworksRepository } from '../../../infrastructure/docker/docker-networks.repository';
import { NetworksService } from '../networks.service';

import { Service } from '@features/services/domain/models/service.models';
import { DatabaseServicesRepository } from '@features/services/infrastructure/database/db-services.repository';

jest.mock('../../../application/get-networks-by-service.use-case');

const mockGetNetworksByServiceUseCase = getNetworksByServiceUseCase as jest.MockedFunction<
    typeof getNetworksByServiceUseCase
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

const networks: Network[] = [
    {
        id: 'net-a1b2c3d4',
        name: 'web-frontend_default',
        driver: 'bridge',
        scope: 'local',
        internal: false,
        attachable: true,
        createdAt: new Date('2026-07-11T00:00:00.000Z'),
    },
];

describe('NetworksService', () => {
    let mockServicesRepository: jest.Mocked<Pick<DatabaseServicesRepository, 'findById'>>;
    let mockNetworksRepository: jest.Mocked<Pick<DockerNetworksRepository, 'listByService'>>;
    let sut: NetworksService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockServicesRepository = { findById: jest.fn() };
        mockNetworksRepository = { listByService: jest.fn() };

        const moduleRef = await Test.createTestingModule({
            providers: [
                NetworksService,
                { provide: DatabaseServicesRepository, useValue: mockServicesRepository },
                { provide: DockerNetworksRepository, useValue: mockNetworksRepository },
            ],
        }).compile();

        sut = moduleRef.get(NetworksService);
    });

    describe('getByService', () => {
        it('looks the service up by its id before listing networks', async () => {
            mockServicesRepository.findById.mockResolvedValue(service);
            mockGetNetworksByServiceUseCase.mockResolvedValue(networks);

            await sut.getByService(serviceId);

            expect(mockServicesRepository.findById).toHaveBeenCalledTimes(1);
            expect(mockServicesRepository.findById).toHaveBeenCalledWith(serviceId);
        });

        it('delegates to the use case with the networks repository and the resolved service', async () => {
            mockServicesRepository.findById.mockResolvedValue(service);
            mockGetNetworksByServiceUseCase.mockResolvedValue(networks);

            await sut.getByService(serviceId);

            expect(mockGetNetworksByServiceUseCase).toHaveBeenCalledTimes(1);
            expect(mockGetNetworksByServiceUseCase).toHaveBeenCalledWith(mockNetworksRepository, service);
        });

        it('returns the networks produced by the use case', async () => {
            mockServicesRepository.findById.mockResolvedValue(service);
            mockGetNetworksByServiceUseCase.mockResolvedValue(networks);

            const result = await sut.getByService(serviceId);

            expect(result).toBe(networks);
        });

        it('returns an empty list when the service has no networks', async () => {
            mockServicesRepository.findById.mockResolvedValue(service);
            mockGetNetworksByServiceUseCase.mockResolvedValue([]);

            const result = await sut.getByService(serviceId);

            expect(result).toEqual([]);
        });

        it('throws ServiceNotFoundError when the service does not exist', async () => {
            mockServicesRepository.findById.mockResolvedValue(null);

            await expect(sut.getByService(serviceId)).rejects.toThrow(ServiceNotFoundError);
            await expect(sut.getByService(serviceId)).rejects.toThrow(`Service ${serviceId} not found`);
        });

        it('never raises an HTTP exception when the service is missing, leaving that to the controller', async () => {
            mockServicesRepository.findById.mockResolvedValue(null);

            await expect(sut.getByService(serviceId)).rejects.not.toBeInstanceOf(HttpException);
        });

        it('never invokes the use case when the service is missing', async () => {
            mockServicesRepository.findById.mockResolvedValue(null);

            await expect(sut.getByService(serviceId)).rejects.toThrow(ServiceNotFoundError);
            expect(mockGetNetworksByServiceUseCase).not.toHaveBeenCalled();
        });

        it('propagates errors thrown while resolving the service', async () => {
            const error = new Error('db unreachable');
            mockServicesRepository.findById.mockRejectedValue(error);

            await expect(sut.getByService(serviceId)).rejects.toThrow(error);
            expect(mockGetNetworksByServiceUseCase).not.toHaveBeenCalled();
        });

        it('propagates errors thrown while listing the networks', async () => {
            const error = new Error('daemon unreachable');
            mockServicesRepository.findById.mockResolvedValue(service);
            mockGetNetworksByServiceUseCase.mockRejectedValue(error);

            await expect(sut.getByService(serviceId)).rejects.toThrow(error);
        });
    });
});
