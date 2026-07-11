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
     * Run `docker-compose up` for a given compose file and project name
     *
     * @param composeContent Raw docker-compose YAML
     * @param projectName Compose project name used to group the stack's resources
     * @param onLog Optional listener receiving real-time output as the stack comes up
     */
    up: (composeContent: string, projectName: string, onLog?: DockerLogListener) => Promise<void>;
}
