import { Test } from '@nestjs/testing';

import { getNetworksByServiceUseCase } from '../../../application/get-networks-by-service.use-case';
import { NetworkStatus } from '../../../domain/models/network.models';
import { DockerNetworksRepository } from '../../../infrastructure/docker/docker-networks.repository';
import { NetworksService } from '../networks.service';

import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { DatabaseServicesRepository } from '@features/services/infrastructure/database/db-services.repository';

jest.mock('../../../application/get-networks-by-service.use-case');

const mockGetNetworksByServiceUseCase = getNetworksByServiceUseCase as jest.MockedFunction<
    typeof getNetworksByServiceUseCase
>;

const serviceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const networks: NetworkStatus[] = [
    {
        id: 'net-a1b2c3d4',
        name: 'web-frontend_default',
        driver: 'bridge',
        scope: 'local',
        internal: false,
        attachable: true,
        createdAt: new Date('2026-07-11T00:00:00.000Z'),
        state: 'attached',
    },
];

describe('NetworksService', () => {
    let mockServicesRepository: jest.Mocked<Pick<DatabaseServicesRepository, 'findById'>>;
    let mockNetworksRepository: jest.Mocked<Pick<DockerNetworksRepository, 'listByService' | 'listConnectedByService'>>;
    let sut: NetworksService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockServicesRepository = { findById: jest.fn() };
        mockNetworksRepository = { listByService: jest.fn(), listConnectedByService: jest.fn() };

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
        it('delegates to the use case with both repositories and the service id', async () => {
            mockGetNetworksByServiceUseCase.mockResolvedValue(networks);

            await sut.getByService(serviceId);

            expect(mockGetNetworksByServiceUseCase).toHaveBeenCalledTimes(1);
            expect(mockGetNetworksByServiceUseCase).toHaveBeenCalledWith(
                mockServicesRepository,
                mockNetworksRepository,
                serviceId,
            );
        });

        it('returns the networks produced by the use case', async () => {
            mockGetNetworksByServiceUseCase.mockResolvedValue(networks);

            const result = await sut.getByService(serviceId);

            expect(result).toBe(networks);
        });

        it('returns an empty list when the service has no networks', async () => {
            mockGetNetworksByServiceUseCase.mockResolvedValue([]);

            const result = await sut.getByService(serviceId);

            expect(result).toEqual([]);
        });

        it('propagates the ServiceNotFoundError raised by the use case untranslated', async () => {
            mockGetNetworksByServiceUseCase.mockRejectedValue(new ServiceNotFoundError(serviceId));

            await expect(sut.getByService(serviceId)).rejects.toThrow(ServiceNotFoundError);
        });

        it('propagates any other error raised by the use case', async () => {
            const error = new Error('daemon unreachable');
            mockGetNetworksByServiceUseCase.mockRejectedValue(error);

            await expect(sut.getByService(serviceId)).rejects.toThrow(error);
        });
    });
});
