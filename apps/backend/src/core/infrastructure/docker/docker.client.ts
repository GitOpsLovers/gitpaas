import { Injectable, Logger } from '@nestjs/common';
import Docker from 'dockerode';

/** Unix socket of the local Docker daemon, mounted into the backend container. */
const DOCKER_SOCKET_PATH = '/var/run/docker.sock';

/**
 * Docker client
 */
@Injectable()
export class DockerClient {
    private readonly logger = new Logger(DockerClient.name);

    private client: Docker | undefined;

    /**
     * Lazily-created, reused Dockerode client.
     */
    public getClient(): Docker {
        this.client ??= this.createClient();

        return this.client;
    }

    /**
     * Creates a new Dockerode client
     */
    private createClient(): Docker {
        this.logger.log(`Connecting to the local Docker daemon at ${DOCKER_SOCKET_PATH}`);

        return new Docker({ socketPath: DOCKER_SOCKET_PATH });
    }
}
