import type { DatabaseDebugStatus } from '@gitpaas/contracts';

import { DEBUG_CONTAINER_LABELS } from '../domain/constants/database-debug.constants';
import type { DebugRole } from '../domain/ports/debug-role.port';

import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';

/**
 * Ends the session of the debug of the database: the console goes, and the role loses its login.
 *
 * @param runtime Container runtime port
 * @param role Debug role port
 *
 * @returns The state the session leaves, which is always stopped
 */
export async function stopDatabaseDebugUseCase(
    runtime: ContainerRuntime,
    role: DebugRole,
): Promise<DatabaseDebugStatus> {
    const containers = await runtime.listContainers({ labels: DEBUG_CONTAINER_LABELS }, true);

    for (const container of containers) {
        await runtime.removeContainer(container.id, { force: true, removeVolumes: true });
    }

    await role.revokeLogin();

    return { running: false, url: null };
}
