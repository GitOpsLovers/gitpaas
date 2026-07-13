/**
 * Callback invoked with each captured line of `docker-compose up` output.
 *
 * @param line A single log line (without trailing newline)
 */
export type DockerLogListener = (line: string) => void;

/**
 * Docker executor interface
 */
export interface DockerExecutor {
    /**
     * Build (from source) and run a stack from a repository archive
     *
     * @param archive Gzipped tarball of the repository source
     * @param composePath Path to the compose file within the repository
     * @param projectName Compose project name used to group the stack's resources
     * @param onLog Optional listener receiving real-time output as the stack comes up
     */
    up: (archive: Buffer, composePath: string, projectName: string, onLog?: DockerLogListener) => Promise<void>;
}
