import { Test } from '@nestjs/testing';

import { ContainerRuntimeInfo } from '../../../domain/models/container-runtime.models';
import type { ContainerRuntime } from '../../../domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '../../../infrastructure/docker/docker-container-runtime.adapter';
import { ContainerRuntimeService } from '../container-runtime.service';

const runtimeInfo: ContainerRuntimeInfo = {
    serverVersion: '27.1.1',
    operatingSystem: 'Ubuntu 24.04',
    containers: 4,
    images: 12,
};

describe('ContainerRuntimeService', () => {
    let mockContainerRuntime: jest.Mocked<Pick<ContainerRuntime, 'ping' | 'info'>>;
    let sut: ContainerRuntimeService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockContainerRuntime = {
            ping: jest.fn(),
            info: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            providers: [
                ContainerRuntimeService,
                { provide: DockerContainerRuntimeAdapter, useValue: mockContainerRuntime },
            ],
        }).compile();

        sut = moduleRef.get(ContainerRuntimeService);
    });

    describe('ping', () => {
        it('pings the runtime once', async () => {
            mockContainerRuntime.ping.mockResolvedValue(true);

            await sut.ping();

            expect(mockContainerRuntime.ping).toHaveBeenCalledTimes(1);
            expect(mockContainerRuntime.ping).toHaveBeenCalledWith();
        });

        it('returns true when the runtime reports a healthy daemon', async () => {
            mockContainerRuntime.ping.mockResolvedValue(true);

            const result = await sut.ping();

            expect(result).toBe(true);
        });

        it('returns false when the runtime reports an unhealthy daemon', async () => {
            mockContainerRuntime.ping.mockResolvedValue(false);

            const result = await sut.ping();

            expect(result).toBe(false);
        });

        it('propagates errors thrown while pinging the daemon', async () => {
            const error = new Error('docker daemon unreachable');
            mockContainerRuntime.ping.mockRejectedValue(error);

            await expect(sut.ping()).rejects.toThrow(error);
        });
    });

    describe('info', () => {
        it('queries the runtime info once', async () => {
            mockContainerRuntime.info.mockResolvedValue(runtimeInfo);

            await sut.info();

            expect(mockContainerRuntime.info).toHaveBeenCalledTimes(1);
            expect(mockContainerRuntime.info).toHaveBeenCalledWith();
        });

        it('returns the container runtime info the runtime reports', async () => {
            mockContainerRuntime.info.mockResolvedValue(runtimeInfo);

            const result = await sut.info();

            expect(result).toEqual({
                serverVersion: '27.1.1',
                operatingSystem: 'Ubuntu 24.04',
                containers: 4,
                images: 12,
            });
        });

        it('propagates errors thrown while querying the daemon info', async () => {
            const error = new Error('docker daemon unreachable');
            mockContainerRuntime.info.mockRejectedValue(error);

            await expect(sut.info()).rejects.toThrow(error);
        });
    });
});
