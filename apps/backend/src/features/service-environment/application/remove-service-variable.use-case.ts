import { ServiceVariableNotFoundError } from '../domain/errors/service-variable.errors';
import { ServiceVariablesRepository } from '../domain/repositories/service-variables.repository';

/**
 * Use case for removing a variable of a service.
 *
 * @param repository Service variables repository
 * @param serviceId Service the variable belongs to
 * @param id Variable id
 *
 * @throws ServiceVariableNotFoundError When the service holds no variable of that id
 */
export async function removeServiceVariableUseCase(
    repository: ServiceVariablesRepository,
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
}
