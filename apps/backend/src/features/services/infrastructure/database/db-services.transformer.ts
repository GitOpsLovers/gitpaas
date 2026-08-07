import { Service } from '../../domain/models/service.models';

import { DbServiceEntity } from './db-service.entity';

/**
 * Maps a service database entity into its domain model.
 *
 * @param entity Service database entity
 *
 * @returns Domain service
 */
export function toService(entity: DbServiceEntity): Service {
    return {
        id: entity.id,
        name: entity.name,
        projectId: entity.projectId,
        repositoryId: entity.repositoryId,
        deploymentBranch: entity.deploymentBranch,
        composerPath: entity.composerPath,
    };
}
