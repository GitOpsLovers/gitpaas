import { ServiceVariable, ServiceVariableRow } from '../domain/models/service-variable.models';
import { ComposeEnvironmentCacheStore } from '../domain/ports/compose-environment-cache-store.port';
import { ServiceVariablesRepository } from '../domain/repositories/service-variables.repository';

/**
 * Builds the row of a variable the table holds, which keeps its stored value.
 *
 * @param variable Variable of the table
 * @param composeRefreshedAt Moment of the read of the compose file, or `null` when the compose file declares no such name
 *
 * @returns The row of the list
 */
function toStoredRow(variable: ServiceVariable, composeRefreshedAt: Date | null): ServiceVariableRow {
    return {
        ...variable,
        origin: composeRefreshedAt === null ? 'user' : 'compose',
        composeRefreshedAt,
    };
}

/**
 * Builds the row of a name the compose file declares and the table does not hold, which the user never saved.
 *
 * @param serviceId Service the name belongs to
 * @param name Name the compose file declares
 * @param value Literal value the compose file gives to the name
 * @param composeRefreshedAt Moment of the read of the compose file
 *
 * @returns The row of the list
 */
function toComposeRow(
    serviceId: string,
    name: string,
    value: string,
    composeRefreshedAt: Date,
): ServiceVariableRow {
    return {
        id: null,
        serviceId,
        name,
        secret: false,
        value,
        valueSet: value.length > 0,
        origin: 'compose',
        composeRefreshedAt,
    };
}

/**
 * Use case for listing the variables of a service, as the union of the rows of the table and of the names the compose file declares.
 *
 * @param repository Service variables repository
 * @param cacheStore Store of the cache of the compose environment of a service
 * @param serviceId Service the variables belong to
 *
 * @returns Rows of the service, ordered by name. A name of both sides gives one row, which keeps the value of the table
 */
export async function getServiceVariablesByServiceUseCase(
    repository: ServiceVariablesRepository,
    cacheStore: ComposeEnvironmentCacheStore,
    serviceId: string,
): Promise<ServiceVariableRow[]> {
    const [variables, cache] = await Promise.all([
        repository.getByService(serviceId),
        cacheStore.findByService(serviceId),
    ]);

    const declared = cache?.variables ?? {};
    const refreshedAt = cache?.refreshedAt ?? null;

    const stored = variables.map((variable) => toStoredRow(
        variable,
        refreshedAt !== null && Object.hasOwn(declared, variable.name) ? refreshedAt : null,
    ));

    const storedNames = new Set(variables.map((variable) => variable.name));

    const unsaved = refreshedAt === null
        ? []
        : Object.entries(declared)
            .filter(([name]) => !storedNames.has(name))
            .map(([name, value]) => toComposeRow(serviceId, name, value, refreshedAt));

    return [...stored, ...unsaved].sort((one, other) => one.name.localeCompare(other.name));
}
