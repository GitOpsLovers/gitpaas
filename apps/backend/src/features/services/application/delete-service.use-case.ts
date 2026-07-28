import { ServiceFootprint } from '../domain/ports/service-footprint.port';
import { ServicesRepository } from '../domain/repositories/services.repository';

import { DeploymentsRepository } from '@features/deployments/domain/repositories/deployments.repository';
import { LogStore } from '@features/logs/domain/ports/log-store.port';

/**
 * Use case for deleting a service
 *
 * Drops the service row first, then performs best-effort external teardown only
 * when the delete actually succeeded. It enumerates the service's deployments
 * (needed for the log purge) before deleting the row, since the database cascade
 * removes the deployment and log rows. After a successful delete it tears down
 * the service's own Docker resources on the server (best-effort) and purges each of
 * its deployments' buffered Redis logs. If the delete removes nothing, external
 * state is left untouched.
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
    serviceFootprint: ServiceFootprint,
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

    await serviceFootprint.remove(service);

    for (const deployment of deployments) {
        await logStore.purge(deployment.id);
    }

    return true;
}
