import type { UpdateVolumeDto } from '@gitpaas/contracts';

import { VolumeNameTakenError, VolumeNotFoundError } from '../domain/errors/volume.errors';
import { VolumeStatus } from '../domain/models/volume.models';
import { DaemonVolumesRepository } from '../domain/repositories/daemon-volumes.repository';
import { ServiceVolumesRepository } from '../domain/repositories/service-volumes.repository';
import { VolumesRepository } from '../domain/repositories/volumes.repository';

import { getVolumeDaemonNameUseCase } from './get-volume-daemon-name.use-case';
import { getVolumeDaemonViewUseCase, getVolumeStatusUseCase } from './get-volume-status.use-case';

import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

/**
 * Use case for changing the display name of a volume of a service.
 *
 * @param servicesRepository Services repository
 * @param volumesRepository Volumes repository
 * @param serviceVolumesRepository Service volumes repository
 * @param daemonVolumesRepository Daemon volumes repository
 * @param serviceId Service the volume belongs to
 * @param volumeId Volume id
 * @param updateDto New volume data
 *
 * @returns Renamed volume, with the state the daemon gives it
 *
 * @throws ServiceNotFoundError When no service carries that id
 * @throws VolumeNotFoundError When the service holds no volume of that id
 * @throws VolumeNameTakenError When the service already holds another volume of that name
 */
export async function renameVolumeUseCase(
    servicesRepository: ServicesRepository,
    volumesRepository: VolumesRepository,
    serviceVolumesRepository: ServiceVolumesRepository,
    daemonVolumesRepository: DaemonVolumesRepository,
    serviceId: string,
    volumeId: string,
    updateDto: UpdateVolumeDto,
): Promise<VolumeStatus> {
    const service = await servicesRepository.findById(serviceId);

    if (!service) {
        throw new ServiceNotFoundError(serviceId);
    }

    const volume = await volumesRepository.findById(volumeId);

    if (volume?.serviceId !== serviceId) {
        throw new VolumeNotFoundError(volumeId);
    }

    const volumes = await volumesRepository.listByService(serviceId);

    if (volumes.some((sibling) => sibling.name === updateDto.name && sibling.id !== volumeId)) {
        throw new VolumeNameTakenError(serviceId, updateDto.name);
    }

    const renamed = await volumesRepository.rename(volumeId, updateDto.name);

    if (!renamed) {
        throw new VolumeNotFoundError(volumeId);
    }

    const [mounts, view] = await Promise.all([
        serviceVolumesRepository.listByService(serviceId),
        getVolumeDaemonViewUseCase(daemonVolumesRepository, service),
    ]);

    return getVolumeStatusUseCase(
        renamed,
        getVolumeDaemonNameUseCase(service, renamed.daemonKey),
        mounts.find((mount) => mount.volumeId === volumeId) ?? null,
        view,
    );
}
