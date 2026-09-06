import {
    DEBUG_CONTAINER_LABELS,
    GITPAAS_DEBUG_LABEL,
} from '../../domain/constants/database-debug.constants';
import type { DebugRole } from '../../domain/ports/debug-role.port';
import { stopDatabaseDebugUseCase } from '../stop-database-debug.use-case';

import type { RuntimeContainerSummary } from '@core/domain/models/container-runtime.models';
import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';

/**
 * Builds the summary of a container of the debug, overriding only the fields under test.
 */
const debugContainer = (overrides: Partial<RuntimeContainerSummary> = {}): RuntimeContainerSummary => ({
    id: 'c0ffee00',
    names: ['/gitpaas-db-debug'],
    image: 'elestio/pgadmin:REL-9_16',
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

describe('stopDatabaseDebugUseCase', () => {
    let mockContainerRuntime: jest.Mocked<Pick<ContainerRuntime, 'listContainers' | 'removeContainer'>>;
    let mockDebugRole: jest.Mocked<Pick<DebugRole, 'revokeLogin'>>;

    /** Runs the use case with the mocked ports. */
    const run = (): Promise<unknown> =>
        stopDatabaseDebugUseCase(
            mockContainerRuntime as unknown as ContainerRuntime,
            mockDebugRole as unknown as DebugRole,
        );

    beforeEach(() => {
        jest.clearAllMocks();
        mockContainerRuntime = {
            listContainers: jest.fn().mockResolvedValue([]),
            removeContainer: jest.fn().mockResolvedValue(undefined),
        };
        mockDebugRole = { revokeLogin: jest.fn().mockResolvedValue(undefined) };
    });

    it('looks the container up by the labels of the debug alone, stopped ones included', async () => {
        await run();

        expect(mockContainerRuntime.listContainers).toHaveBeenCalledTimes(1);
        expect(mockContainerRuntime.listContainers).toHaveBeenCalledWith({ labels: DEBUG_CONTAINER_LABELS }, true);
        // eslint-disable-next-line security/detect-object-injection
        expect(DEBUG_CONTAINER_LABELS[GITPAAS_DEBUG_LABEL]).toBe('pgadmin');
    });

    it('force-removes every container of the debug, with the volumes it carries', async () => {
        mockContainerRuntime.listContainers.mockResolvedValue([
            debugContainer({ id: 'first' }),
            debugContainer({ id: 'second', state: 'exited' }),
        ]);

        await run();

        expect(mockContainerRuntime.removeContainer).toHaveBeenCalledTimes(2);
        expect(mockContainerRuntime.removeContainer).toHaveBeenNthCalledWith(1, 'first', { force: true, removeVolumes: true });
        expect(mockContainerRuntime.removeContainer).toHaveBeenNthCalledWith(2, 'second', { force: true, removeVolumes: true });
    });

    it('revokes the login of the role even when no container of the debug is left', async () => {
        await run();

        expect(mockContainerRuntime.removeContainer).not.toHaveBeenCalled();
        expect(mockDebugRole.revokeLogin).toHaveBeenCalledTimes(1);
    });

    it('answers a session that is stopped and that carries no address', async () => {
        mockContainerRuntime.listContainers.mockResolvedValue([debugContainer()]);

        await expect(run()).resolves.toEqual({ running: false, url: null });
    });

    it('never revokes the login when the removal of the container fails', async () => {
        mockContainerRuntime.listContainers.mockResolvedValue([debugContainer()]);
        const failure = new Error('daemon unreachable');
        mockContainerRuntime.removeContainer.mockRejectedValue(failure);

        await expect(run()).rejects.toThrow(failure);
        expect(mockDebugRole.revokeLogin).not.toHaveBeenCalled();
    });
});
