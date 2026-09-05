import type {
    CheckControlPlaneDomainDto,
    ControlPlaneDomainCheckResult,
    OrphanRemovalResult,
    PlatformSettings,
    PlatformUpdateStatus,
    PruneResult,
    ReadinessResult,
    ServerStatus,
    UpdatePlatformSettingsDto,
    UpdatePlatformSettingsResult,
} from '@gitpaas/contracts';
import { checkControlPlaneDomainSchema, updatePlatformSettingsSchema } from '@gitpaas/contracts';
import {
    // eslint-disable-next-line @typescript-eslint/no-redeclare
    Body,
    Controller,
    Get,
    HttpCode,
    Post,
    Put,
    ServiceUnavailableException,
    UseGuards,
} from '@nestjs/common';

import { ServerService } from '../services/server.service';

import { DaemonUnreachableError } from '@core/domain/errors/container-runtime.errors';
import { ZodValidationPipe } from '@core/ui/pipes/zod-validation.pipe';
import { translateError } from '@core/ui/translators/http-error.translator';
import { Public } from '@features/authentication/ui/decorators/public.decorator';
import { Roles } from '@features/authentication/ui/decorators/roles.decorator';
import { RolesGuard } from '@features/authentication/ui/guards/roles.guard';
import { UserRole } from '@features/users/domain/models/user.models';

/**
 * Server controller
 */
@Controller('server')
@UseGuards(RolesGuard)
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
            if (error instanceof DaemonUnreachableError) {
                throw new ServiceUnavailableException(
                    'Could not reach the server Docker daemon. Verify the server is running and reachable.',
                    { cause: error },
                );
            }

            throw translateError(error);
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
     * Writes the parameters of the deployment system. An administrator alone reaches it.
     *
     * @param updateDto Parameters to keep
     *
     * @returns Parameters the system keeps, and the advice of the check of the domain
     */
    @Put('settings')
    @Roles(UserRole.Admin)
    public async updateSettings(
        @Body(new ZodValidationPipe(updatePlatformSettingsSchema)) updateDto: UpdatePlatformSettingsDto,
    ): Promise<UpdatePlatformSettingsResult> {
        try {
            return await this.service.updateSettings(updateDto);
        } catch (error) {
            throw translateError(error);
        }
    }

    /**
     * Checks that a domain of the control plane points at this host. An administrator alone reaches it.
     *
     * @param checkDto Host of the control plane the operator considers
     *
     * @returns The advice of the check, or nothing when the domain points at this host
     */
    @Post('settings/domain-check')
    @HttpCode(200)
    @Roles(UserRole.Admin)
    public async checkDomain(
        @Body(new ZodValidationPipe(checkControlPlaneDomainSchema)) checkDto: CheckControlPlaneDomainDto,
    ): Promise<ControlPlaneDomainCheckResult> {
        try {
            return await this.service.checkDomain(checkDto.gitpaasDomain);
        } catch (error) {
            throw translateError(error);
        }
    }

    /**
     * Reads the version the platform runs, the latest release published, and the state of the last update.
     *
     * @returns The versions of the installation and the state of its last update
     */
    @Get('update')
    @Roles(UserRole.Admin)
    public async getUpdate(): Promise<PlatformUpdateStatus> {
        try {
            return await this.service.getUpdate();
        } catch (error) {
            throw translateError(error);
        }
    }

    /**
     * Reads the latest release from GitHub at once, and answers the state of the update it leaves.
     *
     * @returns The versions of the installation and the state of its last update
     */
    @Post('update/check')
    @HttpCode(200)
    @Roles(UserRole.Admin)
    public async checkUpdate(): Promise<PlatformUpdateStatus> {
        try {
            return await this.service.checkUpdate();
        } catch (error) {
            throw translateError(error);
        }
    }

    /**
     * Starts the update of the platform towards the latest release.
     *
     * @returns The versions of the installation and the update that started
     */
    @Post('update')
    @HttpCode(202)
    @Roles(UserRole.Admin)
    public async startUpdate(): Promise<PlatformUpdateStatus> {
        try {
            return await this.service.startUpdate();
        } catch (error) {
            if (error instanceof DaemonUnreachableError) {
                throw new ServiceUnavailableException(
                    'Could not start the update of the platform. Verify the server is running and reachable.',
                    { cause: error },
                );
            }

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
            if (error instanceof DaemonUnreachableError) {
                throw new ServiceUnavailableException(
                    `Could not prune ${resource}. Verify the server is running and reachable.`,
                    { cause: error },
                );
            }

            throw translateError(error);
        }
    }
}
