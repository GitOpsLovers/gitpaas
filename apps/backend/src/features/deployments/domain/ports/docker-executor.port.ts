import type { RoutingLabels } from '@features/domains/domain/ports/reverse-proxy.port';

/**
 * Callback invoked with each captured line of `docker-compose up` output.
 *
 * @param line A single log line (without trailing newline)
 */
export type DockerLogListener = (line: string) => void;

/**
 * Docker executor port
 */
export interface DockerExecutor {
    /**
     * Build and run a stack from a repository archive
     *
     * @param archive Gzipped tarball of the repository source
     * @param composePath Path to the compose file within the repository
     * @param projectName Compose project name used to group the stack's resources
     * @param environment Variables of the service, which the containers of the stack read
     * @param routing Labels of the routing, grouped by the compose service each domain names
     * @param networks Names on the daemon of the networks of the project the containers of the stack join
     * @param onLog Optional listener receiving real-time output as the stack comes up
     */
    up: (
        archive: Buffer,
        composePath: string,
        projectName: string,
        environment: Record<string, string>,
        routing: RoutingLabels,
        networks: string[],
        onLog?: DockerLogListener,
    ) => Promise<void>;

    /**
     * Lists the compose services a repository archive declares.
     *
     * @param archive Gzipped tarball of the repository source
     * @param composePath Path to the compose file within the repository
     *
     * @returns The names of the services of the parsed recipe
     */
    listComposeServices: (archive: Buffer, composePath: string) => Promise<string[]>;
}
