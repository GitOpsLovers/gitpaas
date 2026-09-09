import type { RoutingLabels } from '@features/domains/domain/ports/reverse-proxy.port';

/**
 * Callback invoked with each captured line of `docker-compose up` output.
 *
 * @param line A single log line (without trailing newline)
 */
export type DockerLogListener = (line: string) => void;

/**
 * The stack of one service, as the executor addresses it on the daemon.
 */
export interface DeploymentTarget {
    /**
     * Identifier of the service, stamped on every resource of the stack.
     */
    serviceId: string;

    /**
     * Compose project name the stack is grouped under.
     */
    projectName: string;
}

/**
 * Docker executor port
 */
export interface DockerExecutor {
    /**
     * Build and run a stack from a repository archive
     *
     * @param archive Gzipped tarball of the repository source
     * @param composePath Path to the compose file within the repository
     * @param target Stack of the service the deployment drives
     * @param environment Variables of the service, which the containers of the stack read
     * @param routing Labels of the routing, grouped by the compose service each domain names
     * @param onLog Optional listener receiving real-time output as the stack comes up
     *
     * @returns The final Compose text the stack came up from, with the value of every variable masked
     */
    up: (
        archive: Buffer,
        composePath: string,
        target: DeploymentTarget,
        environment: Record<string, string>,
        routing: RoutingLabels,
        onLog?: DockerLogListener,
    ) => Promise<string>;

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
