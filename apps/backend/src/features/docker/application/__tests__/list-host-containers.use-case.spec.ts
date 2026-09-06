import { listHostContainersUseCase } from '../list-host-containers.use-case';

import type { RuntimeContainerSummary } from '@core/domain/models/container-runtime.models';
import { ContainerRuntime } from '@core/domain/ports/container-runtime.port';

/** Builds a summary of a container of the host, overriding only the fields under test. */
const containerSummary = (overrides: Partial<RuntimeContainerSummary> = {}): RuntimeContainerSummary => ({
    id: 'a1b2c3d4e5f6',
    names: ['gitpaas-backend'],
    image: 'gitpaas/backend:latest',
    state: 'running',
    status: 'Up 3 minutes',
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    projects: [],
    serviceId: null,
    ephemeral: false,
    ports: [],
    networks: ['gitpaas'],
    mounts: [],
    ...overrides,
});

describe('listHostContainersUseCase', () => {
    let mockContainerRuntime: jest.Mocked<Pick<ContainerRuntime, 'listContainers'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockContainerRuntime = { listContainers: jest.fn() };
    });

    it('asks the runtime for the whole host, and for the stopped containers too', async () => {
        mockContainerRuntime.listContainers.mockResolvedValue([]);

        await listHostContainersUseCase(mockContainerRuntime as unknown as ContainerRuntime);

        expect(mockContainerRuntime.listContainers).toHaveBeenCalledTimes(1);
        expect(mockContainerRuntime.listContainers).toHaveBeenCalledWith({ host: true }, true);
    });

    it('returns the containers the runtime reported', async () => {
        const containers = [containerSummary()];
        mockContainerRuntime.listContainers.mockResolvedValue(containers);

        const result = await listHostContainersUseCase(mockContainerRuntime as unknown as ContainerRuntime);

        expect(result).toBe(containers);
    });

    it('returns an empty list when the host runs no container', async () => {
        mockContainerRuntime.listContainers.mockResolvedValue([]);

        const result = await listHostContainersUseCase(mockContainerRuntime as unknown as ContainerRuntime);

        expect(result).toEqual([]);
    });

    it('propagates the failure of the runtime', async () => {
        const error = new Error('daemon unreachable');
        mockContainerRuntime.listContainers.mockRejectedValue(error);

        await expect(listHostContainersUseCase(mockContainerRuntime as unknown as ContainerRuntime)).rejects.toThrow(
            error,
        );
    });
});
