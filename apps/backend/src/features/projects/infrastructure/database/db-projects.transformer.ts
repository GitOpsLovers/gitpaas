import { ProjectNameTakenError } from '../../domain/errors/project.errors';
import { Project } from '../../domain/models/project.models';

import { DbProjectEntity } from './db-project.entity';

/**
 * PostgreSQL `SQLSTATE` of a unique violation.
 */
const UNIQUE_VIOLATION = '23505';

/**
 * Reads the `SQLSTATE` a driver failure carries.
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
 * Maps a failure raised while writing a project into the domain error that describes it.
 *
 * @param error Caught error
 * @param namespaceId Identifier of the namespace the project belongs to
 * @param name Name the project was written with
 *
 * @returns The domain error to throw, or the original error when unclassifiable
 */
export function toProjectPersistenceError(error: unknown, namespaceId: string, name: string): unknown {
    if (readSqlState(error) === UNIQUE_VIOLATION) {
        return new ProjectNameTakenError(namespaceId, name, { cause: error });
    }

    return error;
}

/**
 * Maps a project database entity into its domain model, deriving the services
 * count from the loaded `services` relation.
 *
 * @param entity Project database entity (with its `services` relation loaded)
 *
 * @returns Domain project
 */
export function toProject(entity: DbProjectEntity): Project {
    return {
        id: entity.id,
        name: entity.name,
        namespaceId: entity.namespaceId,
        servicesCount: entity.services?.length ?? 0,
    };
}
