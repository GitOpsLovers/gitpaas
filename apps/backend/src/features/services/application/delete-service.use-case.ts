import { ServiceFootprintRepository } from '../domain/repositories/service-footprint.repository';
import { ServicesRepository } from '../domain/repositories/services.repository';

import { DeploymentsRepository } from '@features/deployments/domain/repositories/deployments.repository';
import { LogStoreRepository } from '@features/logs/domain/repositories/log-store.repository';

/**
 * Use case for deleting a service
 *
 * Removes the service's runtime footprint before dropping its row. First it
 * tears down the service's own Docker resources on the VPS (best-effort) and
 * purges each of its deployments' buffered Redis logs, then deletes the service
 * row — whose database cascade removes the deployment and log rows.
 *
 * @param servicesRepository Services repository
 * @param deploymentsRepository Deployments repository (to enumerate the service's deployments)
 * @param serviceFootprint Service Docker footprint teardown port
 * @param logStore Log store write port
 * @param id Service id
 *
 * @returns `true` when a row was deleted, `false` otherwise
 */
export async function deleteServiceUseCase(
    servicesRepository: ServicesRepository,
    deploymentsRepository: DeploymentsRepository,
    serviceFootprint: ServiceFootprintRepository,
    logStore: LogStoreRepository,
    id: string,
): Promise<boolean> {
    const service = await servicesRepository.findById(id);

    if (!service) {
        return false;
    }

    const deployments = await deploymentsRepository.getAllByService(id);

    await serviceFootprint.remove(service);

    for (const deployment of deployments) {
        await logStore.purge(deployment.id);
    }

    return servicesRepository.delete(id);
}
