import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import Docker, { DockerInfo } from 'dockerode';

@Injectable()

/**
 * Docker service
 */
export class DockerService {
    private readonly logger = new Logger(DockerService.name);

    private client: Docker | undefined;

    /**
     * Lazily-created, reused Dockerode client.
     */
    public getClient(): Docker {
        this.client ??= this.createClient();

        return this.client;
    }

    /**
     * Returns `true` when the daemon answers a ping.
     */
    public async ping(): Promise<boolean> {
        const response = await this.getClient().ping();

        return response.toString() === 'OK';
    }

    /**
     * Returns the daemon's info (server version, container counts, etc.).
     */
    public info(): Promise<DockerInfo> {
        return this.getClient().info();
    }

    /**
     * Creates a new Dockerode client
     */
    private createClient(): Docker {
        const host = process.env.VPS_DOCKER_HOST ?? '127.0.0.1';
        const port = Number(process.env.VPS_DOCKER_PORT ?? 2376);
        const certPath = process.env.VPS_DOCKER_CERT_PATH ?? resolve(process.cwd(), '../../.dev/vps-certs/client');

        let ca: Buffer;
        let cert: Buffer;
        let key: Buffer;

        try {
            ca = readFileSync(join(certPath, 'ca.pem'));
            cert = readFileSync(join(certPath, 'cert.pem'));
            key = readFileSync(join(certPath, 'key.pem'));
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
