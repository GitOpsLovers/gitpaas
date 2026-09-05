import { DaemonVolumesRepository } from '../domain/repositories/daemon-volumes.repository';
import { VolumesRepository } from '../domain/repositories/volumes.repository';

import { getVolumeDaemonNameUseCase } from './get-volume-daemon-name.use-case';

import { Service } from '@features/services/domain/models/service.models';
import { getServiceSlug } from '@shared/application/get-service-slug.use-case';

/**
 * Callback invoked with the line one copy of a volume writes.
 *
 * @param line A single log line (without trailing newline)
 */
export type VolumeCopyListener = (line: string) => void;

/**
 * Use case for building the name a volume carried on the daemon before the stack took the name of its Compose project.
 *
 * @param service Service the volume belongs to
 * @param daemonKey Key of the volume inside the Compose file
 *
 * @returns Name the volume carries on the daemon under the old convention
 */
export function getVolumeLegacyDaemonNameUseCase(service: Service, daemonKey: string): string {
    return getVolumeDaemonNameUseCase(getServiceSlug(service), daemonKey);
}

/**
 * Use case for carrying the data of the volumes of a service over to the names its stack takes now.
 *
 * @param volumesRepository Volumes repository
 * @param daemonVolumesRepository Daemon volumes repository
 * @param service Service the volumes belong to
 * @param onLine Listener receiving one line for each volume the use case copies
 *
 * @throws Error When the daemon cannot create the new volume or cannot copy the data into it
 */
export async function copyLegacyVolumesUseCase(
    volumesRepository: VolumesRepository,
    daemonVolumesRepository: DaemonVolumesRepository,
    service: Service,
    onLine: VolumeCopyListener,
): Promise<void> {
    const volumes = await volumesRepository.listByService(service.id);

    for (const volume of volumes) {
        const daemonName = getVolumeDaemonNameUseCase(service.composeProject, volume.daemonKey);
        const legacyName = getVolumeLegacyDaemonNameUseCase(service, volume.daemonKey);

        if (legacyName === daemonName) {
            continue;
        }

        const current = await daemonVolumesRepository.findByName(daemonName);

        if (current) {
            continue;
        }

        const legacy = await daemonVolumesRepository.findByName(legacyName);

        if (!legacy) {
            continue;
        }

        await daemonVolumesRepository.create(service, daemonName);
        await daemonVolumesRepository.copyData(legacyName, daemonName);

        onLine(`▹ Copied the data of the volume ${volume.name} from ${legacyName} into ${daemonName}.`);
    }
}
