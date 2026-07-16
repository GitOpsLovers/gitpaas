import { DeploymentsRepository } from '../domain/repositories/deployments.repository';

import { LogStoreRepository } from '@features/logs/domain/repositories/log-store.repository';

/**
 * Use case for deleting a deployment
 *
 * Deletes the deployment record and, when a row was actually removed, purges
 * its buffered logs from the log store. The durable `logs` rows are removed by
 * the database cascade.
 *
 * @param repository Deployments repository
 * @param logStore Log store write port
 * @param id Deployment identifier
 *
 * @returns `true` when a row was deleted, `false` otherwise
 */
export async function deleteDeploymentUseCase(
    repository: DeploymentsRepository,
    logStore: LogStoreRepository,
    id: string,
): Promise<boolean> {
    const deleted = await repository.delete(id);

    if (deleted) {
        await logStore.purge(id);
    }

    return deleted;
}
