import { listHostNetworksUseCase } from '../list-host-networks.use-case';

import type { RuntimeNetworkSummary } from '@core/domain/models/container-runtime.models';
import { ContainerRuntime } from '@core/domain/ports/container-runtime.port';

/** Builds a summary of a network of the host, overriding only the fields under test. */
const networkSummary = (overrides: Partial<RuntimeNetworkSummary> = {}): RuntimeNetworkSummary => ({
    id: 'net-1',
    name: 'gitpaas',
    driver: 'bridge',
    scope: 'local',
    internal: false,
    attachable: true,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    labels: {},
    ...overrides,
});

describe('listHostNetworksUseCase', () => {
    let mockContainerRuntime: jest.Mocked<Pick<ContainerRuntime, 'listNetworks'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockContainerRuntime = { listNetworks: jest.fn() };
    });

    it('asks the runtime for the networks of the whole host', async () => {
        mockContainerRuntime.listNetworks.mockResolvedValue([]);

        await listHostNetworksUseCase(mockContainerRuntime as unknown as ContainerRuntime);

        expect(mockContainerRuntime.listNetworks).toHaveBeenCalledTimes(1);
        expect(mockContainerRuntime.listNetworks).toHaveBeenCalledWith({ host: true });
    });

    it('returns the networks the runtime reported', async () => {
        const networks = [networkSummary()];
        mockContainerRuntime.listNetworks.mockResolvedValue(networks);

        const result = await listHostNetworksUseCase(mockContainerRuntime as unknown as ContainerRuntime);

        expect(result).toBe(networks);
    });

    it('returns an empty list when the host holds no network', async () => {
        mockContainerRuntime.listNetworks.mockResolvedValue([]);

        const result = await listHostNetworksUseCase(mockContainerRuntime as unknown as ContainerRuntime);

        expect(result).toEqual([]);
    });

    it('propagates the failure of the runtime', async () => {
        const error = new Error('daemon unreachable');
        mockContainerRuntime.listNetworks.mockRejectedValue(error);

        await expect(listHostNetworksUseCase(mockContainerRuntime as unknown as ContainerRuntime)).rejects.toThrow(
            error,
        );
    });
});
