import { Service } from '../../domain/models/service.models';

import { DbServiceEntity } from './db-service.entity';

import { FOREIGN_KEY_VIOLATION, readSqlState } from '@core/infrastructure/database/sql-state';
import { ProjectNotFoundError } from '@features/projects/domain/errors/project.errors';

/**
 * Maps a failure raised while writing a service into the domain error that describes it.
 *
 * @param error Caught error
 * @param projectId Identifier of the project the service was attached to
 *
 * @returns The domain error to throw, or the original error when unclassifiable
 */
export function toServicePersistenceError(error: unknown, projectId: string): unknown {
    if (readSqlState(error) === FOREIGN_KEY_VIOLATION) {
        return new ProjectNotFoundError(projectId, { cause: error });
    }

    return error;
}

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
