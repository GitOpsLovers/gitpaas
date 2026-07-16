declare module 'dockerode-compose' {
    import type Docker from 'dockerode';

    /**
     * Minimal typings for `dockerode-compose`, which ships no types of its own.
     * It reads a compose file from disk and orchestrates it through a Dockerode client.
     */
    class DockerodeCompose {
        constructor(docker: Docker, composeFilePath: string, projectName: string);

        public pull(serviceName?: string, options?: Record<string, unknown>): Promise<unknown>;

        public up(options?: Record<string, unknown>): Promise<unknown>;

        public down(options?: Record<string, unknown>): Promise<unknown>;
    }

    export default DockerodeCompose;
}
