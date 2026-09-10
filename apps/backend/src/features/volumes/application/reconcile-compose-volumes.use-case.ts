import { randomUUID } from 'node:crypto';

import { ComposeVolumeDeclaration, ServiceVolumeMount, VolumeMount } from '../domain/models/volume.models';
import { ServiceVolumesRepository } from '../domain/repositories/service-volumes.repository';
import { VolumesRepository } from '../domain/repositories/volumes.repository';

/**
 * Tells whether the mount the database caches already carries what the compose file declares.
 *
 * @param stored Mount of the join of the database, or `undefined` when the service holds none for the volume
 * @param mount Mount the compose file declares
 *
 * @returns `true` when no field of the declaration differs from the cache
 */
function matchesMount(stored: ServiceVolumeMount | undefined, mount: VolumeMount): boolean {
    return stored?.composeServiceName === mount.composeServiceName
        && stored.containerPath === mount.containerPath
        && stored.readOnly === mount.readOnly;
}

/**
 * Brings the cache of the mount of one volume to the mount the compose file declares.
 *
 * @param serviceVolumesRepository Service volumes repository, which caches the mount of the compose file
 * @param serviceId Service the volume belongs to
 * @param volumeId Volume the mount belongs to
 * @param mount Mount the compose file declares, or `null` when no service of the stack mounts the volume
 * @param stored Mount of the join of the database, or `undefined` when the service holds none for the volume
 */
async function reconcileMount(
    serviceVolumesRepository: ServiceVolumesRepository,
    serviceId: string,
    volumeId: string,
    mount: VolumeMount | null,
    stored: ServiceVolumeMount | undefined,
): Promise<void> {
    if (!mount) {
        if (stored) {
            await serviceVolumesRepository.delete(serviceId, volumeId);
        }

        return;
    }

    if (matchesMount(stored, mount)) {
        return;
    }

    await serviceVolumesRepository.save(serviceId, { volumeId, ...mount });
}

/**
 * Use case that brings the volumes a service holds to the named volumes its compose file declares.
 *
 * @param volumesRepository Volumes repository
 * @param serviceVolumesRepository Service volumes repository, which caches the mount of the compose file
 * @param serviceId Service the volumes belong to
 * @param declarations Named volumes the compose file declares, each one with its mount
 */
export async function reconcileComposeVolumesUseCase(
    volumesRepository: VolumesRepository,
    serviceVolumesRepository: ServiceVolumesRepository,
    serviceId: string,
    declarations: ComposeVolumeDeclaration[],
): Promise<void> {
    const [stored, mounts] = await Promise.all([
        volumesRepository.listByService(serviceId),
        serviceVolumesRepository.listByService(serviceId),
    ]);

    const declaredKeys = new Set(declarations.map((declaration) => declaration.daemonKey));
    const storedByKey = new Map(stored.map((volume) => [volume.daemonKey, volume]));
    const mountsByVolume = new Map(mounts.map((mount) => [mount.volumeId, mount]));

    // The row of a volume that the compose file no longer declares is stale, and its mount goes with it.
    for (const volume of stored) {
        if (!declaredKeys.has(volume.daemonKey)) {
            await volumesRepository.delete(volume.id);
        }
    }

    for (const declaration of declarations) {
        const existing = storedByKey.get(declaration.daemonKey);
        const volumeId = existing?.id ?? randomUUID();

        if (!existing) {
            await volumesRepository.create({
                id: volumeId, serviceId, name: declaration.daemonKey, daemonKey: declaration.daemonKey,
            });
        }

        await reconcileMount(
            serviceVolumesRepository,
            serviceId,
            volumeId,
            declaration.mount,
            mountsByVolume.get(volumeId),
        );
    }
}
