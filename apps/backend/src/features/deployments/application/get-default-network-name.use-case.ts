/**
 * Key the `default` network carries in a recipe that Compose parses.
 */
export const COMPOSE_DEFAULT_NETWORK_KEY = 'default';

/**
 * Use case for building the key the default network of one service carries inside the Compose file.
 *
 * @param serviceId Identifier of the service the network belongs to
 *
 * @returns Key of the default network inside the Compose file
 */
export function getDefaultNetworkKeyUseCase(serviceId: string): string {
    return `${serviceId}_${COMPOSE_DEFAULT_NETWORK_KEY}`;
}

/**
 * Use case for building the name the default network of one service carries on the daemon, which Compose prefixes with its project.
 *
 * @param composeProjectName Name of the Compose project of the service
 * @param serviceId Identifier of the service the network belongs to
 *
 * @returns Name of the default network on the daemon
 */
export function getDefaultNetworkNameUseCase(composeProjectName: string, serviceId: string): string {
    return `${composeProjectName}_${getDefaultNetworkKeyUseCase(serviceId)}`;
}
