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
 * Use case for building the name a volume carries on the daemon, which Compose prefixes with its project.
 *
 * @param composeProjectName Name of the Compose project of the service
 * @param daemonKey Key of the volume inside the Compose file
 *
 * @returns Name of the volume on the daemon
 */
export function getVolumeDaemonNameUseCase(composeProjectName: string, daemonKey: string): string {
    return `${composeProjectName}_${daemonKey}`;
}

/**
 * Use case for reading the key of a volume back from the name it carries on the daemon.
 *
 * @param composeProjectName Name of the Compose project of the service
 * @param daemonName Name of the volume on the daemon
 *
 * @returns Key of the volume inside the Compose file
 */
export function getVolumeDaemonKeyFromNameUseCase(composeProjectName: string, daemonName: string): string {
    const prefix = `${composeProjectName}_`;

    return daemonName.startsWith(prefix) ? daemonName.slice(prefix.length) : daemonName;
}
