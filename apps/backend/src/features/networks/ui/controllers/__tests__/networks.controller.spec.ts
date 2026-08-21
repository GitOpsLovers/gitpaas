import type { Network as NetworkResponse } from '@gitpaas/contracts';
import { ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { Network } from '../../../domain/models/network.models';
import { NetworksService } from '../../services/networks.service';
import { NetworksController } from '../networks.controller';

import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';

const serviceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

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

const networkResponses: NetworkResponse[] = [
    {
        id: 'net-a1b2c3d4',
        name: 'web-frontend_default',
        driver: 'bridge',
        scope: 'local',
        internal: false,
        attachable: true,
        createdAt: '2026-07-11T00:00:00.000Z',
    },
];

describe('NetworksController', () => {
    let mockNetworksService: jest.Mocked<Pick<NetworksService, 'getByService'>>;
    let sut: NetworksController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockNetworksService = {
            getByService: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [NetworksController],
            providers: [{ provide: NetworksService, useValue: mockNetworksService }],
        }).compile();

        sut = moduleRef.get(NetworksController);
    });

    describe('getByService', () => {
        it('delegates to the service with the received service id', async () => {
            mockNetworksService.getByService.mockResolvedValue(networks);

            await sut.getByService(serviceId);

            expect(mockNetworksService.getByService).toHaveBeenCalledTimes(1);
            expect(mockNetworksService.getByService).toHaveBeenCalledWith(serviceId);
        });

        it('returns the networks produced by the service', async () => {
            mockNetworksService.getByService.mockResolvedValue(networks);

            const result = await sut.getByService(serviceId);

            expect(result).toEqual(networkResponses);
        });

        it('gives the date of the creation of a network as a text of the ISO form', async () => {
            mockNetworksService.getByService.mockResolvedValue(networks);

            const [first] = await sut.getByService(serviceId);

            const values: unknown[] = Object.values(first);

            expect(typeof first.createdAt).toBe('string');
            expect(values.some((value) => value instanceof Date)).toBe(false);
        });

        it('returns an empty list when the service reports no networks', async () => {
            mockNetworksService.getByService.mockResolvedValue([]);

            const result = await sut.getByService(serviceId);

            expect(result).toEqual([]);
        });

        it('translates a ServiceNotFoundError raised by the service into a NotFoundException', async () => {
            mockNetworksService.getByService.mockRejectedValue(new ServiceNotFoundError(serviceId));

            await expect(sut.getByService(serviceId)).rejects.toBeInstanceOf(NotFoundException);
            await expect(sut.getByService(serviceId)).rejects.toThrow(`Service ${serviceId} not found`);
        });

        it('rethrows a ServiceUnavailableException raised by the service unchanged', async () => {
            const original = new ServiceUnavailableException('daemon down');
            mockNetworksService.getByService.mockRejectedValue(original);

            await expect(sut.getByService(serviceId)).rejects.toBe(original);
        });

        it('rethrows any other HttpException raised by the service unchanged', async () => {
            const original = new ForbiddenException('nope');
            mockNetworksService.getByService.mockRejectedValue(original);

            await expect(sut.getByService(serviceId)).rejects.toBe(original);
        });

        it('wraps an unexpected error into a ServiceUnavailableException', async () => {
            mockNetworksService.getByService.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.getByService(serviceId)).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it('includes remediation guidance in the wrapped error message', async () => {
            mockNetworksService.getByService.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.getByService(serviceId)).rejects.toThrow(/Could not reach the server Docker daemon/);
        });

        it('wraps non-Error rejection values into a ServiceUnavailableException', async () => {
            mockNetworksService.getByService.mockRejectedValue('boom');

            await expect(sut.getByService(serviceId)).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it('chains the original failure as the cause, which the global filter logs', async () => {
            const original = new Error('ECONNREFUSED');
            mockNetworksService.getByService.mockRejectedValue(original);

            const error = await sut.getByService(serviceId).catch((caught: unknown) => caught);

            expect((error as Error).cause).toBe(original);
        });
    });

    describe('telemetry event enrichment', () => {
        it('adds the service id of the listing', async () => {
            mockNetworksService.getByService.mockResolvedValue(networks);

            const event = await runWithTelemetry({}, async () => {
                await sut.getByService(serviceId);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'service.id': serviceId });
        });
    });
});
