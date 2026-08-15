import { Service } from '../../domain/models/service.models';

import { DbServiceEntity } from './db-service.entity';

import { FOREIGN_KEY_VIOLATION, readSqlState } from '@core/infrastructure/database/sql-state';
import { ProjectNotFoundError } from '@features/projects/domain/errors/project.errors';
import { ProviderNotFoundError } from '@features/source-control/domain/errors/provider.errors';

/**
 * Name of the foreign key that ties a service to its provider.
 */
const PROVIDER_FOREIGN_KEY = 'FK_services_providerId';

/**
 * Reads the name of the constraint a driver failure carries.
 *
 * @param error Caught error
 *
 * @returns The name of the constraint, or `undefined` when the error carries none
 */
function readSqlConstraint(error: unknown): string | undefined {
    const candidate = error as { constraint?: unknown; driverError?: { constraint?: unknown } } | null;
    const constraint = candidate?.driverError?.constraint ?? candidate?.constraint;

    return typeof constraint === 'string' ? constraint : undefined;
}

/**
 * Maps a failure raised while writing a service into the domain error that describes it.
 *
 * @param error Caught error
 * @param projectId Identifier of the project the service was attached to
 * @param providerId Identifier of the provider the service was attached to
 *
 * @returns The domain error to throw, or the original error when unclassifiable
 */
export function toServicePersistenceError(error: unknown, projectId: string, providerId?: string): unknown {
    if (readSqlState(error) !== FOREIGN_KEY_VIOLATION) {
        return error;
    }

    if (readSqlConstraint(error) === PROVIDER_FOREIGN_KEY) {
        return new ProviderNotFoundError(providerId ?? '', { cause: error });
    }

    return new ProjectNotFoundError(projectId, { cause: error });
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
        providerId: entity.providerId,
        repositoryId: entity.repositoryId,
        deploymentBranch: entity.deploymentBranch,
        composerPath: entity.composerPath,
    };
}
