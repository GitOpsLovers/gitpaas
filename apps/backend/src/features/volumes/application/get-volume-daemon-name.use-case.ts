import { Service } from '@features/services/domain/models/service.models';

/**
 * Builds the prefix Compose gives to every volume of the stack of a service.
 *
 * @param service Service the volume belongs to
 *
 * @returns Prefix of the name of the volume on the daemon
 */
function getVolumeDaemonPrefix(service: Service): string {
    return `${service.composeProject}_`;
}

/**
 * Use case for building the name a volume carries on the daemon, which Compose prefixes with the name of its project.
 *
 * @param service Service the volume belongs to
 * @param daemonKey Key of the volume inside the Compose file of the user
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
 * @returns Key of the volume inside the Compose file of the user
 */
export function getVolumeDaemonKeyFromNameUseCase(service: Service, daemonName: string): string {
    const prefix = getVolumeDaemonPrefix(service);

    return daemonName.startsWith(prefix) ? daemonName.slice(prefix.length) : daemonName;
}
