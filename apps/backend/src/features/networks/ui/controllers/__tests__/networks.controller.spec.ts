import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { Network } from '../../../domain/models/network.model';
import { NetworksService } from '../../services/networks.service';
import { NetworksController } from '../networks.controller';

import { DiagnosticLoggerService } from '@core/ui/services/diagnostic-logger.service';

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

describe('NetworksController', () => {
    let mockNetworksService: jest.Mocked<Pick<NetworksService, 'getByService'>>;
    let mockDiagnostics: jest.Mocked<Pick<DiagnosticLoggerService, 'error'>>;
    let sut: NetworksController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockNetworksService = {
            getByService: jest.fn(),
        };

        mockDiagnostics = {
            error: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [NetworksController],
            providers: [
                { provide: NetworksService, useValue: mockNetworksService },
                { provide: DiagnosticLoggerService, useValue: mockDiagnostics },
            ],
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

            expect(result).toBe(networks);
        });

        it('returns an empty list when the service reports no networks', async () => {
            mockNetworksService.getByService.mockResolvedValue([]);

            const result = await sut.getByService(serviceId);

            expect(result).toEqual([]);
        });

        it('rethrows a NotFoundException raised by the service unchanged', async () => {
            const original = new NotFoundException(`Service ${serviceId} not found`);
            mockNetworksService.getByService.mockRejectedValue(original);

            await expect(sut.getByService(serviceId)).rejects.toBe(original);
        });

        it('rethrows a ServiceUnavailableException raised by the service unchanged', async () => {
            const original = new ServiceUnavailableException('daemon down');
            mockNetworksService.getByService.mockRejectedValue(original);

            await expect(sut.getByService(serviceId)).rejects.toBe(original);
        });

        it('wraps an unexpected error into a ServiceUnavailableException', async () => {
            mockNetworksService.getByService.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.getByService(serviceId)).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it('includes remediation guidance in the wrapped error message', async () => {
            mockNetworksService.getByService.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.getByService(serviceId)).rejects.toThrow(/Could not reach the VPS Docker daemon/);
        });

        it('wraps non-Error rejection values into a ServiceUnavailableException', async () => {
            mockNetworksService.getByService.mockRejectedValue('boom');

            await expect(sut.getByService(serviceId)).rejects.toBeInstanceOf(ServiceUnavailableException);
        });
    });
});
