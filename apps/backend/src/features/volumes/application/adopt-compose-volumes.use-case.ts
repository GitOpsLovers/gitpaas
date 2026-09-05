import { randomUUID } from 'node:crypto';

import { DaemonVolumesRepository } from '../domain/repositories/daemon-volumes.repository';
import { VolumesRepository } from '../domain/repositories/volumes.repository';

import { getVolumeDaemonKeyFromNameUseCase } from './get-volume-daemon-name.use-case';

import { Service } from '@features/services/domain/models/service.models';

/**
 * Use case for recording the volumes Compose created for the stack of a service and that the database does not hold.
 *
 * @param volumesRepository Volumes repository
 * @param daemonVolumesRepository Daemon volumes repository
 * @param service Service the volumes belong to
 */
export async function adoptComposeVolumesUseCase(
    volumesRepository: VolumesRepository,
    daemonVolumesRepository: DaemonVolumesRepository,
    service: Service,
): Promise<void> {
    const [daemonVolumes, volumes] = await Promise.all([
        daemonVolumesRepository.listByService(service),
        volumesRepository.listByService(service.id),
    ]);

    const known = new Set(volumes.map((volume) => volume.daemonKey));

    for (const daemonVolume of daemonVolumes) {
        const daemonKey = getVolumeDaemonKeyFromNameUseCase(service, daemonVolume.name);

        if (known.has(daemonKey)) {
            continue;
        }

        known.add(daemonKey);

        await volumesRepository.create({
            id: randomUUID(), serviceId: service.id, name: daemonKey, daemonKey, origin: 'compose',
        });
    }
}
