import { Controller, Get, HttpCode, Post, ServiceUnavailableException } from '@nestjs/common';

import { OrphanRemovalResult } from '../../domain/models/orphan-removal-result.model';
import { PruneResult } from '../../domain/models/prune-result.model';
import { ReadinessResult } from '../../domain/models/readiness-result.model';
import { ServerService } from '../services/server.service';

import { DiagnosticLoggerService } from '@core/ui/services/diagnostic-logger.service';
import { Public } from '@features/authentication/ui/decorators/public.decorator';

/**
 * Server controller
 *
 * Exposes maintenance actions that reclaim disk space on the VPS by pruning
 * unused Docker resources.
 */
@Controller('server')
export class ServerController {
    constructor(
        private readonly service: ServerService,
        private readonly diagnostics: DiagnosticLoggerService,
    ) {}

    /**
     * Report readiness by actively probing the server's critical dependencies
     * (PostgreSQL, Redis, Docker daemon).
     *
     * @returns 200 with a per-dependency breakdown when every dependency is up;
     * 503 carrying the same breakdown when any dependency is down
     */
    @Public()
    @Get('readiness')
    public async readiness(): Promise<ReadinessResult> {
        const result = await this.service.checkReadiness();

        if (result.status !== 'ok') {
            throw new ServiceUnavailableException(result);
        }

        return result;
    }

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
     * Force-remove orphaned containers from the VPS
     *
     * @returns Number of orphaned containers removed and their names
     */
    @Post('containers/orphaned')
    @HttpCode(200)
    public removeOrphanedContainers(): Promise<OrphanRemovalResult> {
        return this.prune('orphaned containers', () => this.service.removeOrphanedContainers());
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
    private async prune<T>(resource: string, action: () => Promise<T>): Promise<T> {
        try {
            return await action();
        } catch (error) {
            if (error instanceof ServiceUnavailableException) {
                throw error;
            }

            this.diagnostics.error(`Failed to prune ${resource} on the VPS Docker daemon`, error, ServerController.name);

            throw new ServiceUnavailableException(
                `Could not prune ${resource}. Verify the VPS is running and reachable; `
                    + 'in local development, start the emulated VPS (see CONTRIBUTING.md).',
            );
        }
    }
}
