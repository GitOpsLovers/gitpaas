import { listHostVolumesUseCase } from '../list-host-volumes.use-case';

import type { RuntimeVolumeSummary } from '@core/domain/models/container-runtime.models';
import { ContainerRuntime } from '@core/domain/ports/container-runtime.port';

/** Builds a summary of a volume of the host, overriding only the fields under test. */
const volumeSummary = (overrides: Partial<RuntimeVolumeSummary> = {}): RuntimeVolumeSummary => ({
    name: 'gitpaas_postgres',
    driver: 'local',
    mountpoint: '/var/lib/docker/volumes/gitpaas_postgres/_data',
    scope: 'local',
    labels: {},
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    ...overrides,
});

describe('listHostVolumesUseCase', () => {
    let mockContainerRuntime: jest.Mocked<Pick<ContainerRuntime, 'listVolumes'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockContainerRuntime = { listVolumes: jest.fn() };
    });

    it('asks the runtime for the volumes of the whole host', async () => {
        mockContainerRuntime.listVolumes.mockResolvedValue([]);

        await listHostVolumesUseCase(mockContainerRuntime as unknown as ContainerRuntime);

        expect(mockContainerRuntime.listVolumes).toHaveBeenCalledTimes(1);
        expect(mockContainerRuntime.listVolumes).toHaveBeenCalledWith({ host: true });
    });

    it('returns the volumes the runtime reported', async () => {
        const volumes = [volumeSummary()];
        mockContainerRuntime.listVolumes.mockResolvedValue(volumes);

        const result = await listHostVolumesUseCase(mockContainerRuntime as unknown as ContainerRuntime);

        expect(result).toBe(volumes);
    });

    it('returns an empty list when the host holds no volume', async () => {
        mockContainerRuntime.listVolumes.mockResolvedValue([]);

        const result = await listHostVolumesUseCase(mockContainerRuntime as unknown as ContainerRuntime);

        expect(result).toEqual([]);
    });

    it('propagates the failure of the runtime', async () => {
        const error = new Error('daemon unreachable');
        mockContainerRuntime.listVolumes.mockRejectedValue(error);

        await expect(listHostVolumesUseCase(mockContainerRuntime as unknown as ContainerRuntime)).rejects.toThrow(error);
    });
});
