/**
 * Use case for building the prefix every network of one project carries on the daemon.
 *
 * @param projectId Identifier of the project the networks belong to
 *
 * @returns Prefix of the names of the networks of that project
 */
export function getProjectNetworkDaemonPrefixUseCase(projectId: string): string {
    return `gitpaas-${projectId}-`;
}

/**
 * Use case for building the name a network of a project carries on the daemon.
 *
 * @param projectId Identifier of the project the network belongs to
 * @param networkId Identifier of the network
 *
 * @returns Name of the network on the daemon
 */
export function getProjectNetworkDaemonNameUseCase(projectId: string, networkId: string): string {
    return `${getProjectNetworkDaemonPrefixUseCase(projectId)}${networkId}`;
}
