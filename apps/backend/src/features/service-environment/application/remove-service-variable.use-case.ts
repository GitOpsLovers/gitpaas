import { ServiceVariableNotFoundError } from '../domain/errors/service-variable.errors';
import { ComposeEnvironmentCacheStore } from '../domain/ports/compose-environment-cache-store.port';
import { ServiceVariablesRepository } from '../domain/repositories/service-variables.repository';

/**
 * Use case for removing a variable of a service.
 *
 * @param repository Service variables repository
 * @param cacheStore Store of the cache of the compose environment of a service
 * @param serviceId Service the variable belongs to
 * @param id Variable id
 *
 * @throws ServiceVariableNotFoundError When the service holds no variable of that id
 */
export async function removeServiceVariableUseCase(
    repository: ServiceVariablesRepository,
    cacheStore: ComposeEnvironmentCacheStore,
    serviceId: string,
    id: string,
): Promise<void> {
    const variable = await repository.findById(id);

    if (variable?.serviceId !== serviceId) {
        throw new ServiceVariableNotFoundError(id);
    }

    const deleted = await repository.delete(id);

    if (!deleted) {
        throw new ServiceVariableNotFoundError(id);
    }

    await cacheStore.forgetName(serviceId, variable.name);
}
