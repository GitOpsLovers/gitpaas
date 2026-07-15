import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';

import { Container } from '../../../domain/models/container.model';
import { ContainersService } from '../../services/containers.service';
import { ContainersController } from '../containers.controller';

jest.mock('@features/providers/infrastructure/github/github-app.provider', () => ({
    GithubAppProvider: class GithubAppProvider {},
}));

const serviceId = '11111111-1111-1111-1111-111111111111';

const containers: Container[] = [
    {
        id: 'abc123',
        name: 'web',
        image: 'nginx:latest',
        state: 'running',
        status: 'Up 2 hours',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        ports: [{ privatePort: 80, publicPort: 8080, type: 'tcp' }],
    },
];

describe('ContainersController', () => {
    let service: jest.Mocked<Pick<ContainersService, 'getByService'>>;
    let sut: ContainersController;

    beforeEach(() => {
        service = {
            getByService: jest.fn(),
        };

        sut = new ContainersController(service as unknown as ContainersService);
    });

    describe('getByService', () => {
        it('delegates to the service with the received service id', async () => {
            service.getByService.mockResolvedValue(containers);

            await sut.getByService(serviceId);

            expect(service.getByService).toHaveBeenCalledTimes(1);
            expect(service.getByService).toHaveBeenCalledWith(serviceId);
        });

        it('returns the containers produced by the service', async () => {
            service.getByService.mockResolvedValue(containers);

            const result = await sut.getByService(serviceId);

            expect(result).toBe(containers);
        });

        it('returns an empty list when the service reports no containers', async () => {
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
