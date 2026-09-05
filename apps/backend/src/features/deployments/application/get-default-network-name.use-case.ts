/**
 * Key the `default` network carries in a recipe that Compose parses.
 */
export const COMPOSE_DEFAULT_NETWORK_KEY = 'default';

/**
 * Use case for building the key the default network of a deployment carries inside the Compose file.
 *
 * @returns Key of the default network inside the Compose file
 */
export function getDefaultNetworkKeyUseCase(): string {
    return `network_${COMPOSE_DEFAULT_NETWORK_KEY}`;
}

/**
 * Use case for building the name the default network of a deployment carries on the daemon, which Compose prefixes with its project.
 *
 * @param composeProjectName Name of the Compose project of the deployment
 *
 * @returns Name of the default network on the daemon
 */
export function getDefaultNetworkNameUseCase(composeProjectName: string): string {
    return `${composeProjectName}_${getDefaultNetworkKeyUseCase()}`;
}
