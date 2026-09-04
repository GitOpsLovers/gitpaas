import { DaemonVolume } from '../domain/models/daemon-volume.models';
import { Volume, VolumeMount, VolumeState, VolumeStatus } from '../domain/models/volume.models';
import { DaemonVolumesRepository } from '../domain/repositories/daemon-volumes.repository';

import { Service } from '@features/services/domain/models/service.models';

/**
 * The two reads of the daemon a state of a volume rests on.
 */
export interface VolumeDaemonView {
    volumes: ReadonlyMap<string, DaemonVolume>;
    containers: ReadonlyMap<string, string[]>;
}

/**
 * Use case for reading, in one pass, the volumes of a service on the daemon and the containers that mount them.
 *
 * @param daemonVolumesRepository Daemon volumes repository
 * @param service Service the volumes belong to
 *
 * @returns Volumes of the service on the daemon, and the containers that mount each one
 */
export async function getVolumeDaemonViewUseCase(
    daemonVolumesRepository: DaemonVolumesRepository,
    service: Service,
): Promise<VolumeDaemonView> {
    const [daemonVolumes, daemonMounts] = await Promise.all([
        daemonVolumesRepository.listByService(service),
        daemonVolumesRepository.listMountsByService(service),
    ]);

    const containers = new Map<string, string[]>();

    for (const mount of daemonMounts) {
        containers.set(mount.volumeName, [...containers.get(mount.volumeName) ?? [], mount.containerName]);
    }

    return { volumes: new Map(daemonVolumes.map((volume) => [volume.name, volume])), containers };
}

/**
 * Use case for deriving the state of one volume of a service.
 *
 * @param daemonVolume Volume the daemon holds, or `undefined` when it holds none
 * @param mount Mount of the volume, or `null` when the service attached none
 * @param containers Names of the containers that mount the volume right now
 *
 * @returns State of the volume
 */
export function getVolumeStateUseCase(
    daemonVolume: DaemonVolume | undefined,
    mount: VolumeMount | null,
    containers: string[],
): VolumeState {
    if (containers.length > 0) {
        return 'mounted';
    }

    if (!daemonVolume) {
        return 'missing';
    }

    return mount ? 'pending' : 'declared';
}

/**
 * Use case for joining a volume of the database with the reads of the daemon.
 *
 * @param volume Volume the database holds
 * @param daemonName Name the volume carries on the daemon
 * @param mount Mount of the volume, or `null` when the service attached none
 * @param view Reads of the daemon of the service
 *
 * @returns Volume with its mount, its containers and its state
 */
export function getVolumeStatusUseCase(
    volume: Volume,
    daemonName: string,
    mount: VolumeMount | null,
    view: VolumeDaemonView,
): VolumeStatus {
    const daemonVolume = view.volumes.get(daemonName);
    const containers = view.containers.get(daemonName) ?? [];

    return {
        id: volume.id,
        name: volume.name,
        daemonName,
        origin: volume.origin,
        state: getVolumeStateUseCase(daemonVolume, mount, containers),
        driver: daemonVolume?.driver,
        mountpoint: daemonVolume?.mountpoint,
        ...(mount
            ? {
                mount: {
                    composeServiceName: mount.composeServiceName,
                    containerPath: mount.containerPath,
                    readOnly: mount.readOnly,
                },
            }
            : {}),
        containers,
    };
}
