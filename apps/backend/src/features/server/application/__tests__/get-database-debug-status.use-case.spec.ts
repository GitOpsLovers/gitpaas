import { DEBUG_CONTAINER_LABELS } from '../../domain/constants/database-debug.constants';
import { getDatabaseDebugStatusUseCase } from '../get-database-debug-status.use-case';

import type { RuntimeContainerSummary } from '@core/domain/models/container-runtime.models';
import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';

/** The address the console of the debug answers on. */
const consoleUrl = 'http://gitpaas.example.com:5050';

/**
 * Builds the summary of a container of the debug, overriding only the fields under test.
 */
const debugContainer = (overrides: Partial<RuntimeContainerSummary> = {}): RuntimeContainerSummary => ({
    id: 'c0ffee00',
    names: ['/gitpaas-db-debug'],
    image: 'elestio/pgadmin:REL-9_17',
    state: 'running',
    status: 'Up 2 minutes',
    createdAt: new Date('2026-09-06T10:00:00.000Z'),
    projects: [],
    serviceId: null,
    ephemeral: false,
    ports: [],
    networks: ['gitpaas_default'],
    mounts: [],
    ...overrides,
});

describe('getDatabaseDebugStatusUseCase', () => {
    let mockContainerRuntime: jest.Mocked<Pick<ContainerRuntime, 'listContainers'>>;

    /** Runs the use case with the mocked runtime. */
    const run = (): Promise<unknown> =>
        getDatabaseDebugStatusUseCase(mockContainerRuntime as unknown as ContainerRuntime, consoleUrl);

    beforeEach(() => {
        jest.clearAllMocks();
        mockContainerRuntime = { listContainers: jest.fn().mockResolvedValue([]) };
    });

    it('reads the state from the labels of the runtime alone, stopped containers included', async () => {
        await run();

        expect(mockContainerRuntime.listContainers).toHaveBeenCalledTimes(1);
        expect(mockContainerRuntime.listContainers).toHaveBeenCalledWith({ labels: DEBUG_CONTAINER_LABELS }, true);
    });

    it('reports a running session with the address of its console', async () => {
        mockContainerRuntime.listContainers.mockResolvedValue([debugContainer()]);

        await expect(run()).resolves.toEqual({ running: true, url: consoleUrl });
    });

    it('reports no session when the runtime holds no container of the debug', async () => {
        await expect(run()).resolves.toEqual({ running: false, url: null });
    });

    it('reports no session when the container of the debug is not running', async () => {
        mockContainerRuntime.listContainers.mockResolvedValue([debugContainer({ state: 'exited' })]);

        await expect(run()).resolves.toEqual({ running: false, url: null });
    });

    it('reports a running session when one container of several still runs', async () => {
        mockContainerRuntime.listContainers.mockResolvedValue([
            debugContainer({ id: 'first', state: 'exited' }),
            debugContainer({ id: 'second', state: 'running' }),
        ]);

        await expect(run()).resolves.toEqual({ running: true, url: consoleUrl });
    });

    it('propagates the failure of the runtime', async () => {
        const failure = new Error('daemon unreachable');
        mockContainerRuntime.listContainers.mockRejectedValue(failure);

        await expect(run()).rejects.toThrow(failure);
    });
});
