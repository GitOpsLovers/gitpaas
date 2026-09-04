import { ServiceVolumeMount, VolumeStatus } from '../domain/models/volume.models';
import { DaemonVolumesRepository } from '../domain/repositories/daemon-volumes.repository';
import { ServiceVolumesRepository } from '../domain/repositories/service-volumes.repository';
import { VolumesRepository } from '../domain/repositories/volumes.repository';

import {
    getVolumeDaemonKeyFromNameUseCase,
    getVolumeDaemonNameUseCase,
    GITPAAS_VOLUME_KEY_PREFIX,
} from './get-volume-daemon-name.use-case';
import { getVolumeDaemonViewUseCase, getVolumeStatusUseCase, VolumeDaemonView } from './get-volume-status.use-case';

import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';
import { getServiceSlug } from '@shared/application/get-service-slug.use-case';

/**
 * Gives the volumes the daemon holds and the database does not the state `orphan`.
 *
 * @param view Reads of the daemon of the service
 * @param composeProjectName Name of the Compose project of the service
 * @param knownNames Names on the daemon of the volumes the database holds
 *
 * @returns Volumes of the daemon that no row of the database claims
 */
function toOrphanVolumes(
    view: VolumeDaemonView,
    composeProjectName: string,
    knownNames: Set<string>,
): VolumeStatus[] {
    return [...view.volumes.values()]
        .filter((daemonVolume) => !knownNames.has(daemonVolume.name))
        .map<VolumeStatus>((daemonVolume) => {
            const key = getVolumeDaemonKeyFromNameUseCase(composeProjectName, daemonVolume.name);

            return {
                id: daemonVolume.name,
                name: key,
                daemonName: daemonVolume.name,
                origin: key.startsWith(GITPAAS_VOLUME_KEY_PREFIX) ? 'gitpaas' : 'compose',
                state: 'orphan',
                driver: daemonVolume.driver,
                mountpoint: daemonVolume.mountpoint,
                containers: view.containers.get(daemonVolume.name) ?? [],
            };
        });
}

/**
 * Use case for listing every volume of a service, with the state the daemon gives it.
 *
 * @param servicesRepository Services repository
 * @param volumesRepository Volumes repository
 * @param serviceVolumesRepository Service volumes repository, which holds the mounts of the service
 * @param daemonVolumesRepository Daemon volumes repository
 * @param serviceId Identifier of the service the volumes belong to
 *
 * @returns Volumes of the service, each one with its state
 *
 * @throws ServiceNotFoundError When no service carries that id
 */
export async function getVolumesByServiceUseCase(
    servicesRepository: ServicesRepository,
    volumesRepository: VolumesRepository,
    serviceVolumesRepository: ServiceVolumesRepository,
    daemonVolumesRepository: DaemonVolumesRepository,
    serviceId: string,
): Promise<VolumeStatus[]> {
    const service = await servicesRepository.findById(serviceId);

    if (!service) {
        throw new ServiceNotFoundError(serviceId);
    }

    const composeProjectName = getServiceSlug(service);

    const [volumes, mounts, view] = await Promise.all([
        volumesRepository.listByService(serviceId),
        serviceVolumesRepository.listByService(serviceId),
        getVolumeDaemonViewUseCase(daemonVolumesRepository, service),
    ]);

    const mountsByVolume = new Map<string, ServiceVolumeMount>(mounts.map((mount) => [mount.volumeId, mount]));
    const declared = volumes.map((volume) => getVolumeStatusUseCase(
        volume,
        getVolumeDaemonNameUseCase(composeProjectName, volume.daemonKey),
        mountsByVolume.get(volume.id) ?? null,
        view,
    ));

    const knownNames = new Set(declared.map((volume) => volume.daemonName));

    return [...declared, ...toOrphanVolumes(view, composeProjectName, knownNames)];
}
