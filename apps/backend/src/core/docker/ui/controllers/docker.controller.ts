import { Controller, Get, Logger, ServiceUnavailableException } from '@nestjs/common';

import { DockerService } from '../services/docker.service';

@Controller('vps')

/**
 * Docker controller
 */
export class DockerController {
    private readonly logger = new Logger(DockerController.name);

    constructor(private readonly service: DockerService) {}

    /**
     * Health check for the connection to the VPS's Docker daemon.
     *
     * Confirms the daemon is reachable and Dockerode's TLS auth is valid
     */
    @Get('status')
    public async getStatus(): Promise<{
        connected: boolean;
        serverVersion: string;
        operatingSystem: string;
        containers: number;
        images: number;
    }> {
        try {
            const info = await this.service.info();

            return {
                connected: true,
                serverVersion: info.ServerVersion,
                operatingSystem: info.OperatingSystem,
                containers: info.Containers,
                images: info.Images,
            };
        } catch (error) {
            if (error instanceof ServiceUnavailableException) {
                throw error;
            }

            this.logger.error('Failed to reach the VPS Docker daemon', error);

            throw new ServiceUnavailableException(
                'Could not reach the VPS Docker daemon. Verify the VPS is running and '
                    + 'reachable; in local development, start the emulated VPS (see CONTRIBUTING.md).',
            );
        }
    }
}
