import { ServiceNotFoundError } from '../domain/errors/service.errors';
import { ServiceRuntimeResources } from '../domain/ports/service-runtime-resources.port';
import { ServicesRepository } from '../domain/repositories/services.repository';

import { DeploymentsRepository } from '@features/deployments/domain/repositories/deployments.repository';
import { LogStore } from '@features/logs/domain/ports/log-store.port';

/**
 * Use case for deleting a service
 *
 * @param servicesRepository Services repository
 * @param deploymentsRepository Deployments repository
 * @param serviceRuntimeResources Service runtime resources port
 * @param logStore Log store write port
 * @param id Service id
 *
 * @throws ServiceNotFoundError When the service does not exist
 */
export async function deleteServiceUseCase(
    servicesRepository: ServicesRepository,
    deploymentsRepository: DeploymentsRepository,
    serviceRuntimeResources: ServiceRuntimeResources,
    logStore: LogStore,
    id: string,
): Promise<void> {
    const service = await servicesRepository.findById(id);

    if (!service) {
        throw new ServiceNotFoundError(id);
    }

    const deployments = await deploymentsRepository.getAllByService(id);

    const deleted = await servicesRepository.delete(id);

    if (!deleted) {
        throw new ServiceNotFoundError(id);
    }

    await serviceRuntimeResources.removeRouting(service);
    await serviceRuntimeResources.removeContainers(service);
    await serviceRuntimeResources.removeNetworks(service);
    await serviceRuntimeResources.removeVolumes(service);
    await serviceRuntimeResources.removeImages(service);

    for (const deployment of deployments) {
        await logStore.purge(deployment.id);
    }
}
