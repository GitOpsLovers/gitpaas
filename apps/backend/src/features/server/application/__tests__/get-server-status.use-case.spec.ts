import { getServerStatusUseCase } from '../get-server-status.use-case';

import { ContainerRuntime } from '@core/domain/ports/container-runtime.port';

describe('getServerStatusUseCase', () => {
    let mockRuntime: jest.Mocked<Pick<ContainerRuntime, 'info'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRuntime = {
            info: jest.fn(),
        };
    });

    it('delegates to the container runtime', async () => {
        mockRuntime.info.mockResolvedValue({
            serverVersion: '27.0.3',
            operatingSystem: 'Docker Desktop',
            containers: 0,
            images: 0,
        });

        await getServerStatusUseCase(mockRuntime as unknown as ContainerRuntime);

        expect(mockRuntime.info).toHaveBeenCalledTimes(1);
        expect(mockRuntime.info).toHaveBeenCalledWith();
    });

    it('returns the daemon information reported by the runtime', async () => {
        const info = {
            serverVersion: '27.0.3',
            operatingSystem: 'Ubuntu 24.04',
            containers: 12,
            images: 34,
        };
        mockRuntime.info.mockResolvedValue(info);

        expect(await getServerStatusUseCase(mockRuntime as unknown as ContainerRuntime)).toBe(info);
    });

    it('propagates errors thrown by the runtime', async () => {
        const error = new Error('daemon unreachable');
        mockRuntime.info.mockRejectedValue(error);

        await expect(
            getServerStatusUseCase(mockRuntime as unknown as ContainerRuntime),
        ).rejects.toThrow(error);
    });
});
