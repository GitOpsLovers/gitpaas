import { HttpException } from '@nestjs/common';

import { Network, NetworkStatus } from '../../domain/models/network.models';
import { NetworksRepository } from '../../domain/repositories/networks.repository';
import { getNetworksByServiceUseCase } from '../get-networks-by-service.use-case';

import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { Service } from '@features/services/domain/models/service.models';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

/** Builds a domain network fixture, overriding only the fields under test. */
const network = (overrides: Partial<Network> = {}): Network => ({
    id: 'f1e2d3c4b5a6',
    name: 'web-frontend_default',
    driver: 'bridge',
    scope: 'local',
    internal: false,
    attachable: false,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    ...overrides,
});

describe('getNetworksByServiceUseCase', () => {
    const serviceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

    const service: Service = {
        id: serviceId,
        name: 'web-frontend',
        description: '',
        projectId: 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60',
        providerId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
        repositoryId: '42',
        deploymentBranch: 'main',
        composerPath: 'docker-compose.yml',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const declared = [network()];

    let mockServicesRepository: jest.Mocked<Pick<ServicesRepository, 'findById'>>;
    let mockNetworksRepository: jest.Mocked<Pick<NetworksRepository, 'listByService' | 'listConnectedByService'>>;

    /** Runs the use case with the mocked repositories. */
    const run = (id = serviceId): Promise<NetworkStatus[]> => getNetworksByServiceUseCase(
        mockServicesRepository as unknown as ServicesRepository,
        mockNetworksRepository,
        id,
    );

    beforeEach(() => {
        jest.clearAllMocks();

        mockServicesRepository = { findById: jest.fn().mockResolvedValue(service) };
        mockNetworksRepository = {
            listByService: jest.fn().mockResolvedValue(declared),
            listConnectedByService: jest.fn().mockResolvedValue([]),
        };
    });

    it('resolves the service by its identifier before listing networks', async () => {
        await run();

        expect(mockServicesRepository.findById).toHaveBeenCalledTimes(1);
        expect(mockServicesRepository.findById).toHaveBeenCalledWith(serviceId);
    });

    it('delegates both lookups to the repository with the resolved service', async () => {
        await run();

        expect(mockNetworksRepository.listByService).toHaveBeenCalledTimes(1);
        expect(mockNetworksRepository.listByService).toHaveBeenCalledWith(service);
        expect(mockNetworksRepository.listConnectedByService).toHaveBeenCalledTimes(1);
        expect(mockNetworksRepository.listConnectedByService).toHaveBeenCalledWith(service);
    });

    it('returns an empty list when the service holds no network at all', async () => {
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
        expect(mockNetworksRepository.listConnectedByService).not.toHaveBeenCalled();
    });

    it('propagates errors thrown while resolving the service', async () => {
        const error = new Error('db unreachable');
        mockServicesRepository.findById.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
        expect(mockNetworksRepository.listByService).not.toHaveBeenCalled();
    });

    it('propagates errors thrown by the read of the declared networks', async () => {
        const error = new Error('daemon unreachable');
        mockNetworksRepository.listByService.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });

    it('propagates errors thrown by the read of the connected networks', async () => {
        const error = new Error('daemon unreachable');
        mockNetworksRepository.listConnectedByService.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });

    describe('the merge of the declared networks and of the connected ones', () => {
        it('gives the state attached to a network the stack declares and a container holds', async () => {
            mockNetworksRepository.listByService.mockResolvedValue([network({ name: 'shared' })]);
            mockNetworksRepository.listConnectedByService.mockResolvedValue([network({ name: 'shared' })]);

            const result = await run();

            expect(result).toEqual<NetworkStatus[]>([{ ...network({ name: 'shared' }), state: 'attached' }]);
        });

        it('gives the state declared to a network no container of the service holds', async () => {
            mockNetworksRepository.listByService.mockResolvedValue([network({ name: 'lonely' })]);
            mockNetworksRepository.listConnectedByService.mockResolvedValue([]);

            const result = await run();

            expect(result).toEqual<NetworkStatus[]>([{ ...network({ name: 'lonely' }), state: 'declared' }]);
        });

        it('gives the state connected to a network the stack does not declare', async () => {
            mockNetworksRepository.listByService.mockResolvedValue([]);
            mockNetworksRepository.listConnectedByService.mockResolvedValue([
                network({ id: 'joined', name: 'gitpaas-project-net', internal: true }),
            ]);

            const result = await run();

            expect(result).toEqual<NetworkStatus[]>([
                { ...network({ id: 'joined', name: 'gitpaas-project-net', internal: true }), state: 'connected' },
            ]);
        });

        it('matches the two reads by the name of the network, and not by its identifier', async () => {
            mockNetworksRepository.listByService.mockResolvedValue([network({ id: 'from-the-stack', name: 'shared' })]);
            mockNetworksRepository.listConnectedByService.mockResolvedValue([
                network({ id: 'from-the-container', name: 'shared' }),
            ]);

            const result = await run();

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({ id: 'from-the-stack', state: 'attached' });
        });

        it('holds a network of the two reads one time alone', async () => {
            mockNetworksRepository.listByService.mockResolvedValue([network({ name: 'shared' })]);
            mockNetworksRepository.listConnectedByService.mockResolvedValue([
                network({ name: 'shared' }),
                network({ name: 'joined' }),
            ]);

            const result = await run();

            expect(result.map((entry) => entry.name)).toEqual(['shared', 'joined']);
        });

        it('lists the declared networks before the connected ones, each in the order of its read', async () => {
            mockNetworksRepository.listByService.mockResolvedValue([
                network({ name: 'declared-a' }),
                network({ name: 'declared-b' }),
            ]);
            mockNetworksRepository.listConnectedByService.mockResolvedValue([
                network({ name: 'declared-b' }),
                network({ name: 'connected-a' }),
                network({ name: 'connected-b' }),
            ]);

            const result = await run();

            expect(result).toEqual([
                { ...network({ name: 'declared-a' }), state: 'declared' },
                { ...network({ name: 'declared-b' }), state: 'attached' },
                { ...network({ name: 'connected-a' }), state: 'connected' },
                { ...network({ name: 'connected-b' }), state: 'connected' },
            ]);
        });

        it('keeps every field of the network that the read gives', async () => {
            const summary = network({
                id: 'a1b2c3',
                name: 'web-frontend_default',
                driver: 'overlay',
                scope: 'swarm',
                internal: true,
                attachable: true,
                createdAt: new Date('2026-08-01T10:00:00.000Z'),
            });
            mockNetworksRepository.listByService.mockResolvedValue([summary]);

            const result = await run();

            expect(result[0]).toEqual({ ...summary, state: 'declared' });
        });

        it('never changes the network that the repository gave', async () => {
            const summary = network();
            mockNetworksRepository.listByService.mockResolvedValue([summary]);

            await run();

            expect(summary).not.toHaveProperty('state');
        });
    });
});
