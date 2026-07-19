import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { Container } from '../../../domain/models/container.model';
import { ContainersService } from '../../services/containers.service';
import { ContainersController } from '../containers.controller';

import { DiagnosticLoggerService } from '@core/ui/services/diagnostic-logger.service';

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
    let mockContainersService: jest.Mocked<Pick<ContainersService, 'getByService'>>;
    let mockDiagnostics: jest.Mocked<Pick<DiagnosticLoggerService, 'log' | 'warn' | 'error'>>;
    let sut: ContainersController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockContainersService = {
            getByService: jest.fn(),
        };

        mockDiagnostics = {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [ContainersController],
            providers: [
                { provide: ContainersService, useValue: mockContainersService },
                { provide: DiagnosticLoggerService, useValue: mockDiagnostics },
            ],
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

            expect(result).toBe(containers);
        });

        it('returns an empty list when the service reports no containers', async () => {
            mockContainersService.getByService.mockResolvedValue([]);

            const result = await sut.getByService(serviceId);

            expect(result).toEqual([]);
        });

        it('rethrows a NotFoundException raised by the service unchanged', async () => {
            const original = new NotFoundException(`Service ${serviceId} not found`);
            mockContainersService.getByService.mockRejectedValue(original);

            await expect(sut.getByService(serviceId)).rejects.toBe(original);
        });

        it('rethrows a ServiceUnavailableException raised by the service unchanged', async () => {
            const original = new ServiceUnavailableException('daemon down');
            mockContainersService.getByService.mockRejectedValue(original);

            await expect(sut.getByService(serviceId)).rejects.toBe(original);
        });

        it('wraps an unexpected error into a ServiceUnavailableException', async () => {
            mockContainersService.getByService.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.getByService(serviceId)).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it('includes remediation guidance in the wrapped error message', async () => {
            mockContainersService.getByService.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.getByService(serviceId)).rejects.toThrow(/Could not reach the VPS Docker daemon/);
        });

        it('wraps non-Error rejection values into a ServiceUnavailableException', async () => {
            mockContainersService.getByService.mockRejectedValue('boom');

            await expect(sut.getByService(serviceId)).rejects.toBeInstanceOf(ServiceUnavailableException);
        });
    });
});
