import { DeploymentNotFoundError } from '../domain/errors/deployment.errors';
import { DeploymentsRepository } from '../domain/repositories/deployments.repository';

import { LogStore } from '@features/logs/domain/ports/log-store.port';

/**
 * Use case for deleting a deployment
 *
 * Deletes the deployment record and purges its buffered logs from the log store.
 *
 * @param repository Deployments repository
 * @param logStore Log store port
 * @param id Deployment identifier
 *
 * @throws DeploymentNotFoundError When the deployment does not exist
 */
export async function deleteDeploymentUseCase(
    repository: DeploymentsRepository,
    logStore: LogStore,
    id: string,
): Promise<void> {
    const deleted = await repository.delete(id);

    if (!deleted) {
        throw new DeploymentNotFoundError(id);
    }

    await logStore.purge(id);
}
