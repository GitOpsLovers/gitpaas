import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';

import { Network } from '../../../domain/models/network.model';
import { NetworksService } from '../../services/networks.service';
import { NetworksController } from '../networks.controller';

jest.mock('@features/providers/infrastructure/github/github-app.provider', () => ({
    GithubAppProvider: class GithubAppProvider {},
}));

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
    let service: jest.Mocked<Pick<NetworksService, 'getByService'>>;
    let sut: NetworksController;

    beforeEach(() => {
        service = {
            getByService: jest.fn(),
        };

        sut = new NetworksController(service as unknown as NetworksService);
    });

    describe('getByService', () => {
        it('delegates to the service with the received service id', async () => {
            service.getByService.mockResolvedValue(networks);

            await sut.getByService(serviceId);

            expect(service.getByService).toHaveBeenCalledTimes(1);
            expect(service.getByService).toHaveBeenCalledWith(serviceId);
        });

        it('returns the networks produced by the service', async () => {
            service.getByService.mockResolvedValue(networks);

            const result = await sut.getByService(serviceId);

            expect(result).toBe(networks);
        });

        it('returns an empty list when the service reports no networks', async () => {
            service.getByService.mockResolvedValue([]);

            const result = await sut.getByService(serviceId);

            expect(result).toEqual([]);
        });

        it('rethrows a NotFoundException raised by the service unchanged', async () => {
            const original = new NotFoundException(`Service ${serviceId} not found`);
            service.getByService.mockRejectedValue(original);

            await expect(sut.getByService(serviceId)).rejects.toBe(original);
        });

        it('rethrows a ServiceUnavailableException raised by the service unchanged', async () => {
            const original = new ServiceUnavailableException('daemon down');
            service.getByService.mockRejectedValue(original);

            await expect(sut.getByService(serviceId)).rejects.toBe(original);
        });

        it('wraps an unexpected error into a ServiceUnavailableException', async () => {
            service.getByService.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.getByService(serviceId)).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it('includes remediation guidance in the wrapped error message', async () => {
            service.getByService.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.getByService(serviceId)).rejects.toThrow(/Could not reach the VPS Docker daemon/);
        });

        it('wraps non-Error rejection values into a ServiceUnavailableException', async () => {
            service.getByService.mockRejectedValue('boom');

            await expect(sut.getByService(serviceId)).rejects.toBeInstanceOf(ServiceUnavailableException);
        });
    });
});
