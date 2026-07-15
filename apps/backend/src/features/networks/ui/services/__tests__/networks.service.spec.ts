import { NotFoundException } from '@nestjs/common';

import { getNetworksByServiceUseCase } from '../../../application/get-networks-by-service.use-case';
import { Network } from '../../../domain/models/network.model';
import { DockerNetworksRepository } from '../../../infrastructure/docker/docker-networks.repository';
import { NetworksService } from '../networks.service';

import { Service } from '@features/services/domain/models/service.model';
import { ServicesDatabaseRepository } from '@features/services/infrastructure/database/services-db.repository';

jest.mock('../../../application/get-networks-by-service.use-case');

const getNetworksByServiceUseCaseMock = getNetworksByServiceUseCase as jest.MockedFunction<
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
    let servicesRepository: jest.Mocked<Pick<ServicesDatabaseRepository, 'findById'>>;
    let networksRepository: jest.Mocked<Pick<DockerNetworksRepository, 'listByService'>>;
    let sut: NetworksService;

    beforeEach(() => {
        jest.clearAllMocks();

        servicesRepository = { findById: jest.fn() };
        networksRepository = { listByService: jest.fn() };

        sut = new NetworksService(
            servicesRepository as unknown as ServicesDatabaseRepository,
            networksRepository as unknown as DockerNetworksRepository,
        );
    });

    describe('getByService', () => {
        it('looks the service up by its id before listing networks', async () => {
            servicesRepository.findById.mockResolvedValue(service);
            getNetworksByServiceUseCaseMock.mockResolvedValue(networks);

            await sut.getByService(serviceId);

            expect(servicesRepository.findById).toHaveBeenCalledTimes(1);
            expect(servicesRepository.findById).toHaveBeenCalledWith(serviceId);
        });

        it('delegates to the use case with the networks repository and the resolved service', async () => {
            servicesRepository.findById.mockResolvedValue(service);
            getNetworksByServiceUseCaseMock.mockResolvedValue(networks);

            await sut.getByService(serviceId);

            expect(getNetworksByServiceUseCaseMock).toHaveBeenCalledTimes(1);
            expect(getNetworksByServiceUseCaseMock).toHaveBeenCalledWith(networksRepository, service);
        });

        it('returns the networks produced by the use case', async () => {
            servicesRepository.findById.mockResolvedValue(service);
            getNetworksByServiceUseCaseMock.mockResolvedValue(networks);

            const result = await sut.getByService(serviceId);

            expect(result).toBe(networks);
        });

        it('returns an empty list when the service has no networks', async () => {
            servicesRepository.findById.mockResolvedValue(service);
            getNetworksByServiceUseCaseMock.mockResolvedValue([]);

            const result = await sut.getByService(serviceId);

            expect(result).toEqual([]);
        });

        it('throws NotFoundException when the service does not exist', async () => {
            servicesRepository.findById.mockResolvedValue(null);

            await expect(sut.getByService(serviceId)).rejects.toThrow(NotFoundException);
            await expect(sut.getByService(serviceId)).rejects.toThrow(`Service ${serviceId} not found`);
        });

        it('never invokes the use case when the service is missing', async () => {
            servicesRepository.findById.mockResolvedValue(null);

            await expect(sut.getByService(serviceId)).rejects.toThrow(NotFoundException);
            expect(getNetworksByServiceUseCaseMock).not.toHaveBeenCalled();
        });

        it('propagates errors thrown while resolving the service', async () => {
            const error = new Error('db unreachable');
            servicesRepository.findById.mockRejectedValue(error);

            await expect(sut.getByService(serviceId)).rejects.toThrow(error);
            expect(getNetworksByServiceUseCaseMock).not.toHaveBeenCalled();
        });

        it('propagates errors thrown while listing the networks', async () => {
            const error = new Error('daemon unreachable');
            servicesRepository.findById.mockResolvedValue(service);
            getNetworksByServiceUseCaseMock.mockRejectedValue(error);

            await expect(sut.getByService(serviceId)).rejects.toThrow(error);
        });
    });
});
