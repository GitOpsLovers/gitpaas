import { VolumeNotAttachedError, VolumeNotFoundError } from '../domain/errors/volume.errors';
import { ServiceVolumesRepository } from '../domain/repositories/service-volumes.repository';
import { VolumesRepository } from '../domain/repositories/volumes.repository';

/**
 * Use case for detaching a volume from the service of the Compose file that mounts it.
 *
 * @param volumesRepository Volumes repository
 * @param serviceVolumesRepository Service volumes repository
 * @param serviceId Service the volume belongs to
 * @param volumeId Volume the service detaches
 *
 * @throws VolumeNotFoundError When the service holds no volume of that id
 * @throws VolumeNotAttachedError When the service mounts no such volume
 */
export async function detachVolumeUseCase(
    volumesRepository: VolumesRepository,
    serviceVolumesRepository: ServiceVolumesRepository,
    serviceId: string,
    volumeId: string,
): Promise<void> {
    const volume = await volumesRepository.findById(volumeId);

    if (volume?.serviceId !== serviceId) {
        throw new VolumeNotFoundError(volumeId);
    }

    const detached = await serviceVolumesRepository.detach(serviceId, volumeId);

    if (!detached) {
        throw new VolumeNotAttachedError(volumeId);
    }
}
