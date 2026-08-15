import { Controller, Get, HttpCode, Post, ServiceUnavailableException } from '@nestjs/common';

import { OrphanRemovalResult } from '../../domain/models/orphan-removal-result.models';
import { PruneResult } from '../../domain/models/prune-result.models';
import { ReadinessResult } from '../../domain/models/readiness-result.models';
import { ServerService } from '../services/server.service';

import { ContainerRuntimeInfo } from '@core/domain/models/container-runtime.models';
import { translateError } from '@core/ui/translators/http-error.translator';
import { Public } from '@features/authentication/ui/decorators/public.decorator';

/**
 * Server controller
 */
@Controller('server')
export class ServerController {
    constructor(private readonly service: ServerService) {}

    /**
     * Check the availability of the GitPaaS infrastructure.
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
     * Health check for the connection to the server's Docker daemon.
     */
    @Get('status')
    public async getStatus(): Promise<ContainerRuntimeInfo & { connected: boolean }> {
        try {
            const info = await this.service.getStatus();

            return {
                connected: true,
                ...info,
            };
        } catch (error) {
            throw translateError(error, () => new ServiceUnavailableException(
                'Could not reach the server Docker daemon. Verify the server is running and reachable.',
                { cause: error },
            ));
        }
    }

    /**
     * Remove dangling images from the server
     *
     * @returns Number of images removed and disk space reclaimed
     */
    @Post('prune/images')
    @HttpCode(200)
    public pruneImages(): Promise<PruneResult> {
        return this.prune('images', () => this.service.pruneImages());
    }

    /**
     * Remove unused local volumes from the server
     *
     * @returns Number of volumes removed and disk space reclaimed
     */
    @Post('prune/volumes')
    @HttpCode(200)
    public pruneVolumes(): Promise<PruneResult> {
        return this.prune('volumes', () => this.service.pruneVolumes());
    }

    /**
     * Remove stopped containers from the server
     *
     * @returns Number of containers removed and disk space reclaimed
     */
    @Post('prune/containers')
    @HttpCode(200)
    public pruneContainers(): Promise<PruneResult> {
        return this.prune('containers', () => this.service.pruneContainers());
    }

    /**
     * Force-remove orphaned containers from the server
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
     * 503 that asks the operator to verify the server is running and reachable.
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
            throw translateError(error, () => new ServiceUnavailableException(
                `Could not prune ${resource}. Verify the server is running and reachable.`,
                { cause: error },
            ));
        }
    }
}
