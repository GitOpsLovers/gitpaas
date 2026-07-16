import { Service } from '../../domain/models/service.model';

import { ServiceDbEntity } from './service-db.entity';

/**
 * Maps a service database entity into its domain model.
 *
 * @param entity Service database entity
 *
 * @returns Domain service
 */
export function toService(entity: ServiceDbEntity): Service {
    return {
        id: entity.id,
        name: entity.name,
        projectId: entity.projectId,
        repositoryId: entity.repositoryId,
        deploymentBranch: entity.deploymentBranch,
        composerPath: entity.composerPath,
    };
}
