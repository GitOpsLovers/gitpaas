import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { ContainerRuntimeInfo } from '../../../domain/models/container-runtime.models';
import { ContainerRuntimeService } from '../../services/container-runtime.service';
import { ContainerRuntimeController } from '../container-runtime.controller';

const runtimeInfo: ContainerRuntimeInfo = {
    serverVersion: '27.1.1',
    operatingSystem: 'Ubuntu 24.04',
    containers: 4,
    images: 12,
};

describe('ContainerRuntimeController', () => {
    let mockContainerRuntimeService: jest.Mocked<Pick<ContainerRuntimeService, 'info'>>;
    let sut: ContainerRuntimeController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockContainerRuntimeService = {
            info: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [ContainerRuntimeController],
            providers: [{ provide: ContainerRuntimeService, useValue: mockContainerRuntimeService }],
        }).compile();

        sut = moduleRef.get(ContainerRuntimeController);
    });

    describe('getStatus', () => {
        it('delegates to the service to fetch the daemon info', async () => {
            mockContainerRuntimeService.info.mockResolvedValue(runtimeInfo);

            await sut.getStatus();

            expect(mockContainerRuntimeService.info).toHaveBeenCalledTimes(1);
        });

        it('maps the daemon info into a connected status payload', async () => {
            mockContainerRuntimeService.info.mockResolvedValue(runtimeInfo);

            const result = await sut.getStatus();

            expect(result).toEqual({
                connected: true,
                serverVersion: runtimeInfo.serverVersion,
                operatingSystem: runtimeInfo.operatingSystem,
                containers: runtimeInfo.containers,
                images: runtimeInfo.images,
            });
        });

        it('reflects zeroed counts and empty strings from the daemon info', async () => {
            mockContainerRuntimeService.info.mockResolvedValue({
                serverVersion: '',
                operatingSystem: '',
                containers: 0,
                images: 0,
            });

            const result = await sut.getStatus();

            expect(result).toEqual({
                connected: true,
                serverVersion: '',
                operatingSystem: '',
                containers: 0,
                images: 0,
            });
        });

        it('rethrows a ServiceUnavailableException raised by the service unchanged', async () => {
            const original = new ServiceUnavailableException('daemon down');
            mockContainerRuntimeService.info.mockRejectedValue(original);

            await expect(sut.getStatus()).rejects.toBe(original);
        });

        it('wraps an unexpected error into a ServiceUnavailableException', async () => {
            mockContainerRuntimeService.info.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.getStatus()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it('includes remediation guidance in the wrapped error message', async () => {
            mockContainerRuntimeService.info.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.getStatus()).rejects.toThrow(/Could not reach the server Docker daemon/);
        });

        it('wraps non-Error rejection values into a ServiceUnavailableException', async () => {
            mockContainerRuntimeService.info.mockRejectedValue('boom');

            await expect(sut.getStatus()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });
    });
});
