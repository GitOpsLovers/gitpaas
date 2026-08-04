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
 * @returns `true` when a row was deleted, `false` otherwise
 */
export async function deleteServiceUseCase(
    servicesRepository: ServicesRepository,
    deploymentsRepository: DeploymentsRepository,
    serviceRuntimeResources: ServiceRuntimeResources,
    logStore: LogStore,
    id: string,
): Promise<boolean> {
    const service = await servicesRepository.findById(id);

    if (!service) {
        return false;
    }

    const deployments = await deploymentsRepository.getAllByService(id);

    const deleted = await servicesRepository.delete(id);

    if (!deleted) {
        return false;
    }

    await serviceRuntimeResources.removeContainers(service);
    await serviceRuntimeResources.removeNetworks(service);
    await serviceRuntimeResources.removeImages(service);

    for (const deployment of deployments) {
        await logStore.purge(deployment.id);
    }

    return true;
}
