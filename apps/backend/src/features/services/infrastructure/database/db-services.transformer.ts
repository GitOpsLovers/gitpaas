import { ServiceNameTakenError } from '../../domain/errors/service.errors';
import { ComposeDomainsCache } from '../../domain/models/compose-domains.models';
import { ComposeEnvironmentCache } from '../../domain/models/compose-environment.models';
import { Service } from '../../domain/models/service.models';

import { DbComposeDomains, DbComposeEnvironment, DbServiceEntity } from './db-service.entity';

import { FOREIGN_KEY_VIOLATION, readSqlState, UNIQUE_VIOLATION } from '@core/infrastructure/database/sql-state';
import { ProjectNotFoundError } from '@features/projects/domain/errors/project.errors';
import { ProviderNotFoundError } from '@features/providers/domain/errors/provider.errors';

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
 * @param name Name the service was written with
 * @param providerId Identifier of the provider the service was attached to
 *
 * @returns The domain error to throw, or the original error when unclassifiable
 */
export function toServicePersistenceError(
    error: unknown,
    projectId: string,
    name: string,
    providerId?: string | null,
): unknown {
    if (readSqlState(error) === UNIQUE_VIOLATION) {
        return new ServiceNameTakenError(projectId, name, { cause: error });
    }

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
        description: entity.description,
        projectId: entity.projectId,
        composeProject: entity.composeProject,
        providerId: entity.providerId ?? null,
        repositoryId: entity.repositoryId,
        deploymentBranch: entity.deploymentBranch,
        composerPath: entity.composerPath,
        createdAt: entity.createdAt,
    };
}

/**
 * Maps the cache of the compose environment of a service into the shape its row carries.
 *
 * @param cache Cache of the key `environment` of the compose file of the service
 *
 * @returns The cache of the database
 */
export function toDbComposeEnvironment(cache: ComposeEnvironmentCache): DbComposeEnvironment {
    return {
        variables: cache.variables,
        refreshedAt: cache.refreshedAt.toISOString(),
    };
}

/**
 * Maps the cache of the compose environment of a row into its domain model.
 *
 * @param cache Cache the row of the service carries
 *
 * @returns The cache of the domain, or `null` when the row carries none
 */
export function toComposeEnvironmentCache(cache: DbComposeEnvironment | null): ComposeEnvironmentCache | null {
    if (!cache) {
        return null;
    }

    return {
        variables: cache.variables,
        refreshedAt: new Date(cache.refreshedAt),
    };
}

/**
 * Maps the cache of the compose domains of a service into the shape its row carries.
 *
 * @param cache Cache of the key `x-gitpaas-domain` of the compose file of the service
 *
 * @returns The cache of the database
 */
export function toDbComposeDomains(cache: ComposeDomainsCache): DbComposeDomains {
    return {
        domains: cache.domains.map((domain) => ({
            targetService: domain.targetService,
            host: domain.host,
            port: domain.port,
            https: domain.https,
        })),
        refreshedAt: cache.refreshedAt.toISOString(),
    };
}

/**
 * Maps the cache of the compose domains of a row into its domain model.
 *
 * @param cache Cache the row of the service carries
 *
 * @returns The cache of the domain, or `null` when the row carries none
 */
export function toComposeDomainsCache(cache: DbComposeDomains | null): ComposeDomainsCache | null {
    if (!cache) {
        return null;
    }

    return {
        domains: cache.domains.map((domain) => ({
            targetService: domain.targetService,
            host: domain.host,
            port: domain.port,
            https: domain.https,
        })),
        refreshedAt: new Date(cache.refreshedAt),
    };
}
