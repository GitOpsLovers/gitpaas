import { QueuedDeploymentTask } from '../../domain/models/queued-deployment-task.models';

import { DeploymentQueueTaskDbEntity } from './db-deployment-queue-task.entity';

/**
 * Maps a deployment queue task database entity into its domain model.
 *
 * @param entity Deployment queue task database entity
 *
 * @returns Domain queued deployment task
 */
export function toQueuedDeploymentTask(entity: DeploymentQueueTaskDbEntity): QueuedDeploymentTask {
    return {
        id: entity.id,
        deploymentId: entity.deploymentId,
        repositoryId: entity.repositoryId,
        commit: entity.commit,
        composerPath: entity.composerPath,
        projectName: entity.projectName,
        status: entity.status,
        attempts: entity.attempts,
    };
}
