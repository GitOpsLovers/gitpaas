import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Docker from 'dockerode';

/**
 * Docker client
 */
@Injectable()
export class DockerClient {
    private readonly logger = new Logger(DockerClient.name);

    private client: Docker | undefined;

    constructor(private readonly config: ConfigService) {}

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
        const host = this.config.get<string>('VPS_DOCKER_HOST');
        const port = Number(this.config.get('VPS_DOCKER_PORT'));
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const certPath = this.config.get<string>('VPS_DOCKER_CERT_PATH')!;

        let ca: Buffer;
        let cert: Buffer;
        let key: Buffer;

        try {
            /* eslint-disable security/detect-non-literal-fs-filename -- certPath comes from trusted deployment config (VPS_DOCKER_CERT_PATH), never user input */
            ca = readFileSync(join(certPath, 'ca.pem'));
            cert = readFileSync(join(certPath, 'cert.pem'));
            key = readFileSync(join(certPath, 'key.pem'));
            /* eslint-enable security/detect-non-literal-fs-filename */
        } catch {
            throw new ServiceUnavailableException(
                `Could not read VPS TLS certificates at "${certPath}". `
                    + 'Check VPS_DOCKER_CERT_PATH, or in local development start the '
                    + 'emulated VPS (see CONTRIBUTING.md).',
            );
        }

        this.logger.log(`Connecting to Docker daemon at https://${host}:${port}`);

        return new Docker({
            protocol: 'https', host, port, ca, cert, key,
        });
    }
}
