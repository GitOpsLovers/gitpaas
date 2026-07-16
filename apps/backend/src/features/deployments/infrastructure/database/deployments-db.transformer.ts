import { Deployment } from '../../domain/models/deployment.model';

import { DeploymentDbEntity } from './deployment-db.entity';

/**
 * Maps a deployment database entity into its domain model.
 *
 * @param entity Deployment database entity
 *
 * @returns Domain deployment
 */
export function toDeployment(entity: DeploymentDbEntity): Deployment {
    return {
        id: entity.id,
        serviceId: entity.serviceId,
        status: entity.status,
        branch: entity.branch,
        commit: entity.commit,
        commitMessage: entity.commitMessage,
        composerPath: entity.composerPath,
        triggeredBy: entity.triggeredBy,
        error: entity.error,
        createdAt: entity.createdAt,
        finishedAt: entity.finishedAt,
    };
}
