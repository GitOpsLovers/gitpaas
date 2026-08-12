import { Service } from '../../domain/models/service.models';

import { DbServiceEntity } from './db-service.entity';

import { ProjectNotFoundError } from '@features/projects/domain/errors/project.errors';

/** PostgreSQL `SQLSTATE` of a foreign-key violation. */
const FOREIGN_KEY_VIOLATION = '23503';

/**
 * Reads the `SQLSTATE` a driver failure carries.
 *
 * TypeORM wraps the driver error in a `QueryFailedError` and copies the driver's
 * own properties onto it, so the code can sit on either object.
 *
 * @param error Caught error
 *
 * @returns The `SQLSTATE`, or `undefined` when the error carries none
 */
function readSqlState(error: unknown): string | undefined {
    const candidate = error as { code?: unknown; driverError?: { code?: unknown } } | null;
    const code = candidate?.driverError?.code ?? candidate?.code;

    return typeof code === 'string' ? code : undefined;
}

/**
 * Maps a failure raised while writing a service into the domain error that
 * describes it.
 *
 * The only foreign key the `services` table carries is its project, so a
 * foreign-key violation means the project the caller asked for does not exist:
 * an honest 404 rather than the raw 500 the driver error would become. The
 * driver message never travels with it — the original error is chained through
 * `{ cause }` for the logs only.
 *
 * Any other failure is returned unchanged, so a genuine defect still surfaces as
 * a 500 instead of being dressed up as a friendlier status.
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
