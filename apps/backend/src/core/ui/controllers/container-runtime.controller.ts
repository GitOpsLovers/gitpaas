import { Controller, Get, Logger, ServiceUnavailableException } from '@nestjs/common';

import { ContainerRuntimeInfo } from '../../domain/models/container-runtime.models';
import { ContainerRuntimeService } from '../services/container-runtime.service';

/**
 * Container runtime controller
 */
@Controller('server')
export class ContainerRuntimeController {
    private readonly logger = new Logger(ContainerRuntimeController.name);

    constructor(private readonly service: ContainerRuntimeService) {}

    /**
     * Health check for the connection to the server's Docker daemon.
     *
     * Confirms the daemon is reachable and Dockerode's TLS auth is valid
     */
    @Get('status')
    public async getStatus(): Promise<ContainerRuntimeInfo & { connected: boolean }> {
        try {
            const info = await this.service.info();

            return {
                connected: true,
                ...info,
            };
        } catch (error) {
            if (error instanceof ServiceUnavailableException) {
                throw error;
            }

            this.logger.error('Failed to reach the server Docker daemon', error);

            throw new ServiceUnavailableException(
                'Could not reach the server Docker daemon. Verify the server is running and '
                    + 'reachable; in local development, start the emulated server (see CONTRIBUTING.md).',
            );
        }
    }
}
