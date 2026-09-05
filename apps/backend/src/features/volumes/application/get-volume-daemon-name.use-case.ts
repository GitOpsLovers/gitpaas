import { Service } from '@features/services/domain/models/service.models';
import { getServiceSlug } from '@shared/application/get-service-slug.use-case';

/**
 * Prefix of the key every volume that GitPaaS owns carries inside the Compose file.
 */
export const GITPAAS_VOLUME_KEY_PREFIX = 'gitpaas-';

/**
 * Use case for building the key a volume that GitPaaS owns carries inside the Compose file.
 *
 * @param volumeId Identifier of the volume
 *
 * @returns Key of the volume inside the Compose file
 */
export function getVolumeDaemonKeyUseCase(volumeId: string): string {
    return `${GITPAAS_VOLUME_KEY_PREFIX}${volumeId}`;
}

/**
 * Use case for building the prefix every volume of a service carries on the daemon.
 *
 * @param service Service the volume belongs to
 *
 * @returns Prefix of the name of the volume on the daemon
 */
export function getVolumeDaemonPrefix(service: Service): string {
    return `${service.composeProject}_${getServiceSlug(service)}_`;
}

/**
 * Use case for building the name a volume carries on the daemon, which holds the Compose project and the slug of its service.
 *
 * @param service Service the volume belongs to
 * @param daemonKey Key of the volume inside the Compose file
 *
 * @returns Name of the volume on the daemon
 */
export function getVolumeDaemonNameUseCase(service: Service, daemonKey: string): string {
    return `${getVolumeDaemonPrefix(service)}${daemonKey}`;
}

/**
 * Use case for reading the key of a volume back from the name it carries on the daemon.
 *
 * @param service Service the volume belongs to
 * @param daemonName Name of the volume on the daemon
 *
 * @returns Key of the volume inside the Compose file
 */
export function getVolumeDaemonKeyFromNameUseCase(service: Service, daemonName: string): string {
    const prefix = getVolumeDaemonPrefix(service);

    return daemonName.startsWith(prefix) ? daemonName.slice(prefix.length) : daemonName;
}
