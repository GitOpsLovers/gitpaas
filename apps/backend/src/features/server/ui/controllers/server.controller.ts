import { Controller, HttpCode, Logger, Post, ServiceUnavailableException } from '@nestjs/common';

import { PruneResult } from '../../domain/models/prune-result.model';
import { ServerService } from '../services/server.service';

@Controller('server')

/**
 * Server controller
 *
 * Exposes maintenance actions that reclaim disk space on the VPS by pruning
 * unused Docker resources.
 */
export class ServerController {
    private readonly logger = new Logger(ServerController.name);

    constructor(private readonly service: ServerService) {}

    /**
     * Remove dangling images from the VPS
     *
     * @returns Number of images removed and disk space reclaimed
     */
    @Post('prune/images')
    @HttpCode(200)
    public pruneImages(): Promise<PruneResult> {
        return this.prune('images', () => this.service.pruneImages());
    }

    /**
     * Remove unused local volumes from the VPS
     *
     * @returns Number of volumes removed and disk space reclaimed
     */
    @Post('prune/volumes')
    @HttpCode(200)
    public pruneVolumes(): Promise<PruneResult> {
        return this.prune('volumes', () => this.service.pruneVolumes());
    }

    /**
     * Remove stopped containers from the VPS
     *
     * @returns Number of containers removed and disk space reclaimed
     */
    @Post('prune/containers')
    @HttpCode(200)
    public pruneContainers(): Promise<PruneResult> {
        return this.prune('containers', () => this.service.pruneContainers());
    }

    /**
     * Runs a prune action, translating daemon connectivity failures into a
     * 503 with a hint about the emulated VPS in local development.
     *
     * @param resource Human-readable resource name used in the error message
     * @param action Prune action to execute
     *
     * @returns Number of resources removed and disk space reclaimed
     */
    private async prune(resource: string, action: () => Promise<PruneResult>): Promise<PruneResult> {
        try {
            return await action();
        } catch (error) {
            if (error instanceof ServiceUnavailableException) {
                throw error;
            }

            this.logger.error(`Failed to prune ${resource} on the VPS Docker daemon`, error);

            throw new ServiceUnavailableException(
                `Could not prune ${resource}. Verify the VPS is running and reachable; `
                    + 'in local development, start the emulated VPS (see CONTRIBUTING.md).',
            );
        }
    }
}
