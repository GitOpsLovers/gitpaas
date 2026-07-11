/**
 * Docker executor interface
 */
export interface DockerExecutor {
    /**
     * Run `docker-compose up` for a given compose file and project name
     *
     * @param composeContent Raw docker-compose YAML
     * @param projectName Compose project name used to group the stack's resources
     */
    up: (composeContent: string, projectName: string) => Promise<void>;
}
