import { VolumeMountPathTakenError } from '../domain/errors/volume.errors';
import { ServiceVolumeMount } from '../domain/models/volume.models';

/**
 * Use case for keeping one mount path for one volume alone inside a service.
 *
 * @param mounts Mounts the service already holds
 * @param containerPath Mount path the write asks for
 * @param volumeId Volume the write targets, which keeps its own mount path
 *
 * @throws VolumeMountPathTakenError When another volume of the service already mounts at that path
 */
export function assertMountPathFreeUseCase(
    mounts: ServiceVolumeMount[],
    containerPath: string,
    volumeId?: string,
): void {
    const taken = mounts.some((mount) => mount.containerPath === containerPath && mount.volumeId !== volumeId);

    if (taken) {
        throw new VolumeMountPathTakenError(containerPath);
    }
}
