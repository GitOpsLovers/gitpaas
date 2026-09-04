import type { AttachVolumeDto } from '@gitpaas/contracts';

import { VolumeNotFoundError } from '../domain/errors/volume.errors';
import { ServiceVolumesRepository } from '../domain/repositories/service-volumes.repository';
import { VolumesRepository } from '../domain/repositories/volumes.repository';

import { assertMountPathFreeUseCase } from './assert-mount-path-free.use-case';

/**
 * Use case for attaching a volume of a service to one service of its Compose file.
 *
 * @param volumesRepository Volumes repository
 * @param serviceVolumesRepository Service volumes repository
 * @param serviceId Service the volume belongs to
 * @param volumeId Volume the service attaches
 * @param attachDto Mount the volume takes inside the container
 *
 * @throws VolumeNotFoundError When the service holds no volume of that id
 * @throws VolumeMountPathTakenError When another volume of the service already mounts at that path
 */
export async function attachVolumeUseCase(
    volumesRepository: VolumesRepository,
    serviceVolumesRepository: ServiceVolumesRepository,
    serviceId: string,
    volumeId: string,
    attachDto: AttachVolumeDto,
): Promise<void> {
    const volume = await volumesRepository.findById(volumeId);

    if (volume?.serviceId !== serviceId) {
        throw new VolumeNotFoundError(volumeId);
    }

    const mounts = await serviceVolumesRepository.listByService(serviceId);

    assertMountPathFreeUseCase(mounts, attachDto.containerPath, volumeId);

    await serviceVolumesRepository.attach(serviceId, volumeId, {
        composeServiceName: attachDto.composeServiceName,
        containerPath: attachDto.containerPath,
        readOnly: attachDto.readOnly,
    });
}
