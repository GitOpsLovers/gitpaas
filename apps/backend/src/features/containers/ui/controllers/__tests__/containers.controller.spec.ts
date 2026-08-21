import type { Container as ContainerResponse } from '@gitpaas/contracts';
import { ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { Container } from '../../../domain/models/container.models';
import { ContainersService } from '../../services/containers.service';
import { ContainersController } from '../containers.controller';

import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';

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

const containerResponses: ContainerResponse[] = [
    {
        id: 'abc123',
        name: 'web',
        image: 'nginx:latest',
        state: 'running',
        status: 'Up 2 hours',
        createdAt: '2026-01-01T00:00:00.000Z',
        ports: [{ privatePort: 80, publicPort: 8080, type: 'tcp' }],
    },
];

describe('ContainersController', () => {
    let mockContainersService: jest.Mocked<Pick<ContainersService, 'getByService'>>;
    let sut: ContainersController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockContainersService = {
            getByService: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [ContainersController],
            providers: [{ provide: ContainersService, useValue: mockContainersService }],
        }).compile();

        sut = moduleRef.get(ContainersController);
    });

    describe('getByService', () => {
        it('delegates to the service with the received service id', async () => {
            mockContainersService.getByService.mockResolvedValue(containers);

            await sut.getByService(serviceId);

            expect(mockContainersService.getByService).toHaveBeenCalledTimes(1);
            expect(mockContainersService.getByService).toHaveBeenCalledWith(serviceId);
        });

        it('returns the containers produced by the service', async () => {
            mockContainersService.getByService.mockResolvedValue(containers);

            const result = await sut.getByService(serviceId);

            expect(result).toEqual(containerResponses);
        });

        it('gives the date of the creation of a container as a text of the ISO form', async () => {
            mockContainersService.getByService.mockResolvedValue(containers);

            const [first] = await sut.getByService(serviceId);

            expect(typeof first.createdAt).toBe('string');
            expect(Object.values(first).some((value) => value instanceof Date)).toBe(false);
        });

        it('returns an empty list when the service reports no containers', async () => {
            mockContainersService.getByService.mockResolvedValue([]);

            const result = await sut.getByService(serviceId);

            expect(result).toEqual([]);
        });

        it('translates a ServiceNotFoundError raised by the service into a NotFoundException', async () => {
            mockContainersService.getByService.mockRejectedValue(new ServiceNotFoundError(serviceId));

            await expect(sut.getByService(serviceId)).rejects.toBeInstanceOf(NotFoundException);
            await expect(sut.getByService(serviceId)).rejects.toThrow(`Service ${serviceId} not found`);
        });

        it('rethrows a ServiceUnavailableException raised by the service unchanged', async () => {
            const original = new ServiceUnavailableException('daemon down');
            mockContainersService.getByService.mockRejectedValue(original);

            await expect(sut.getByService(serviceId)).rejects.toBe(original);
        });

        it('rethrows any other HttpException raised by the service unchanged', async () => {
            const original = new ForbiddenException('nope');
            mockContainersService.getByService.mockRejectedValue(original);

            await expect(sut.getByService(serviceId)).rejects.toBe(original);
        });

        it('wraps an unexpected error into a ServiceUnavailableException', async () => {
            mockContainersService.getByService.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.getByService(serviceId)).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it('includes remediation guidance in the wrapped error message', async () => {
            mockContainersService.getByService.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.getByService(serviceId)).rejects.toThrow(/Could not reach the server Docker daemon/);
        });

        it('wraps non-Error rejection values into a ServiceUnavailableException', async () => {
            mockContainersService.getByService.mockRejectedValue('boom');

            await expect(sut.getByService(serviceId)).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it('chains the original failure as the cause, which the global filter logs', async () => {
            const original = new Error('ECONNREFUSED');
            mockContainersService.getByService.mockRejectedValue(original);

            const error = await sut.getByService(serviceId).catch((caught: unknown) => caught);

            expect((error as Error).cause).toBe(original);
        });
    });

    describe('telemetry event enrichment', () => {
        it('adds the service id of the listing', async () => {
            mockContainersService.getByService.mockResolvedValue(containers);

            const event = await runWithTelemetry({}, async () => {
                await sut.getByService(serviceId);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'service.id': serviceId });
        });
    });
});
