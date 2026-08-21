import type {
    OrphanRemovalResult,
    PlatformSettings,
    PruneResult,
    ReadinessResult,
    ServerStatus,
    UpdatePlatformSettingsDto,
} from '@gitpaas/contracts';
import { updatePlatformSettingsSchema } from '@gitpaas/contracts';
import {
    // eslint-disable-next-line @typescript-eslint/no-redeclare
    Body,
    Controller,
    Get,
    HttpCode,
    Post,
    Put,
    ServiceUnavailableException,
} from '@nestjs/common';

import { DaemonUnreachableError } from '../../domain/errors/server.errors';
import { ServerService } from '../services/server.service';

import { ZodValidationPipe } from '@core/ui/pipes/zod-validation.pipe';
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
    public async getStatus(): Promise<ServerStatus> {
        try {
            const info = await this.service.getStatus();

            return {
                connected: true,
                ...info,
            };
        } catch (error) {
            throw translateError(error, () => new ServiceUnavailableException(
                'Could not reach the server Docker daemon. Verify the server is running and reachable.',
                { cause: new DaemonUnreachableError({ cause: error }) },
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
     * Reads the parameters of the deployment system that the operator sets.
     *
     * @returns Parameters of the deployment system
     */
    @Get('settings')
    public async getSettings(): Promise<PlatformSettings> {
        try {
            return await this.service.getSettings();
        } catch (error) {
            throw translateError(error);
        }
    }

    /**
     * Writes the parameters of the deployment system.
     *
     * @param updateDto Parameters to keep
     *
     * @returns Parameters the system keeps
     */
    @Put('settings')
    public async updateSettings(
        @Body(new ZodValidationPipe(updatePlatformSettingsSchema)) updateDto: UpdatePlatformSettingsDto,
    ): Promise<PlatformSettings> {
        try {
            return await this.service.updateSettings(updateDto);
        } catch (error) {
            throw translateError(error);
        }
    }

    /**
     * Runs a prune action.
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
                { cause: new DaemonUnreachableError({ cause: error }) },
            ));
        }
    }
}
