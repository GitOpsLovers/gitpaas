import { ServiceVariable } from '../domain/models/service-variable.models';
import { ServiceVariablesRepository } from '../domain/repositories/service-variables.repository';

/**
 * Use case for listing the variables of a service.
 *
 * @param repository Service variables repository
 * @param serviceId Service the variables belong to
 *
 * @returns Variables of the service, ordered by name
 */
export function getServiceVariablesByServiceUseCase(
    repository: ServiceVariablesRepository,
    serviceId: string,
): Promise<ServiceVariable[]> {
    return repository.getByService(serviceId);
}
