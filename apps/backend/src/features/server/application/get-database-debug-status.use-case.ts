import type { DatabaseDebugStatus } from '@gitpaas/contracts';

import { DEBUG_CONTAINER_LABELS } from '../domain/constants/database-debug.constants';

import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';

/**
 * Reads the state of the session of the debug of the database.
 *
 * @param runtime Container runtime port
 * @param consoleUrl Address an operator reaches the console of the debug at
 *
 * @returns Whether a console of the debug runs, and the address it answers on
 */
export async function getDatabaseDebugStatusUseCase(
    runtime: ContainerRuntime,
    consoleUrl: string,
): Promise<DatabaseDebugStatus> {
    const containers = await runtime.listContainers({ labels: DEBUG_CONTAINER_LABELS }, true);
    const running = containers.some((container) => container.state === 'running');

    return { running, url: running ? consoleUrl : null };
}
