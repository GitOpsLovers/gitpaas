import { DeploymentsRepository } from '../domain/repositories/deployments.repository';

import { LogStore } from '@features/logs/domain/ports/log-store.port';

/**
 * Use case for deleting a deployment
 *
 * Deletes the deployment record and, when a row was actually removed, purges its buffered logs from the log store.
 *
 * @param repository Deployments repository
 * @param logStore Log store port
 * @param id Deployment identifier
 *
 * @returns `true` when a row was deleted, `false` otherwise
 */
export async function deleteDeploymentUseCase(
    repository: DeploymentsRepository,
    logStore: LogStore,
    id: string,
): Promise<boolean> {
    const deleted = await repository.delete(id);

    if (deleted) {
        await logStore.purge(id);
    }

    return deleted;
}
