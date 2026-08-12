import { HttpException } from '@nestjs/common';

import { Network } from '../../domain/models/network.models';
import { NetworksRepository } from '../../domain/repositories/networks.repository';
import { getNetworksByServiceUseCase } from '../get-networks-by-service.use-case';

import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { Service } from '@features/services/domain/models/service.models';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

describe('getNetworksByServiceUseCase', () => {
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
            id: 'f1e2d3c4b5a6',
            name: 'web-frontend_default',
            driver: 'bridge',
            scope: 'local',
            internal: false,
            attachable: false,
            createdAt: new Date('2026-07-11T00:00:00.000Z'),
        },
    ];

    let mockServicesRepository: jest.Mocked<Pick<ServicesRepository, 'findById'>>;
    let mockNetworksRepository: jest.Mocked<Pick<NetworksRepository, 'listByService'>>;

    /** Runs the use case with the mocked repositories. */
    const run = (id = serviceId): Promise<Network[]> => getNetworksByServiceUseCase(
        mockServicesRepository as unknown as ServicesRepository,
        mockNetworksRepository as unknown as NetworksRepository,
        id,
    );

    beforeEach(() => {
        jest.clearAllMocks();

        mockServicesRepository = { findById: jest.fn().mockResolvedValue(service) };
        mockNetworksRepository = { listByService: jest.fn().mockResolvedValue(networks) };
    });

    it('resolves the service by its identifier before listing networks', async () => {
        await run();

        expect(mockServicesRepository.findById).toHaveBeenCalledTimes(1);
        expect(mockServicesRepository.findById).toHaveBeenCalledWith(serviceId);
    });

    it('delegates the lookup to the repository with the resolved service', async () => {
        await run();

        expect(mockNetworksRepository.listByService).toHaveBeenCalledTimes(1);
        expect(mockNetworksRepository.listByService).toHaveBeenCalledWith(service);
    });

    it('returns the networks found by the repository', async () => {
        const result = await run();

        expect(result).toBe(networks);
    });

    it('returns an empty list when the service has no networks', async () => {
        mockNetworksRepository.listByService.mockResolvedValue([]);

        await expect(run()).resolves.toEqual([]);
    });

    it('throws ServiceNotFoundError when the service does not exist', async () => {
        mockServicesRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toThrow(ServiceNotFoundError);
        await expect(run()).rejects.toThrow(`Service ${serviceId} not found`);
    });

    it('never raises an HTTP exception when the service is missing, leaving that to the controller', async () => {
        mockServicesRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.not.toBeInstanceOf(HttpException);
    });

    it('never lists networks when the service is missing', async () => {
        mockServicesRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toThrow(ServiceNotFoundError);
        expect(mockNetworksRepository.listByService).not.toHaveBeenCalled();
    });

    it('propagates errors thrown while resolving the service', async () => {
        const error = new Error('db unreachable');
        mockServicesRepository.findById.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
        expect(mockNetworksRepository.listByService).not.toHaveBeenCalled();
    });

    it('propagates errors thrown by the networks repository', async () => {
        const error = new Error('daemon unreachable');
        mockNetworksRepository.listByService.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
