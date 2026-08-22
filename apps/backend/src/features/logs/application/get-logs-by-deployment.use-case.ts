import { LogArchive, LogEntry } from '../domain/models/log-entry.models';
import { LogsRepository } from '../domain/repositories/logs.repository';

import { findDeploymentByIdUseCase } from '@features/deployments/application/find-deployment-by-id.use-case';
import { Deployment } from '@features/deployments/domain/models/deployment.models';
import { DeploymentsRepository } from '@features/deployments/domain/repositories/deployments.repository';

/**
 * Tells whether the run of a deployment has ended, so an empty archive reads as an output that went away.
 *
 * @param deployment Deployment of the archive, or `null` when it does not exist
 *
 * @returns `true` when no run is in flight for the deployment
 */
function hasRunEnded(deployment: Deployment | null): boolean {
    if (!deployment) {
        return true;
    }

    return deployment.status === 'success' || deployment.status === 'failed' || deployment.finishedAt !== null;
}

/**
 * Use case for listing the archived output of a deployment, with the reason an empty list is empty
 *
 * @param logsRepository Logs repository
 * @param deploymentsRepository Deployments repository
 * @param deploymentId Deployment identifier
 *
 * @returns Ordered log entries of the deployment, and the state of its archive
 */
export async function getLogsByDeploymentUseCase(
    logsRepository: LogsRepository,
    deploymentsRepository: DeploymentsRepository,
    deploymentId: string,
): Promise<LogArchive> {
    const entries: LogEntry[] = await logsRepository.getAllByDeployment(deploymentId);

    if (entries.length > 0) {
        return { state: 'available', entries };
    }

    const deployment = await findDeploymentByIdUseCase(deploymentsRepository, deploymentId);

    return { state: hasRunEnded(deployment) ? 'expired' : 'running', entries };
}
