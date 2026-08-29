import { createProjectNetworkSchema, joinProjectNetworkSchema, updateProjectNetworkSchema } from '@gitpaas/contracts';
import type {
    CreateProjectNetworkDto,
    JoinProjectNetworkDto,
    ProjectNetwork as ProjectNetworkResponse,
    UpdateProjectNetworkDto,
} from '@gitpaas/contracts';
import {
    // eslint-disable-next-line @typescript-eslint/no-redeclare
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    ParseUUIDPipe,
    Post,
    Put,
} from '@nestjs/common';

import { ProjectNetworksService } from '../services/project-networks.service';
import { toProjectNetworkResponse } from '../transformers/project-network-response.transformer';

import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { ZodValidationPipe } from '@core/ui/pipes/zod-validation.pipe';
import { translateError } from '@core/ui/translators/http-error.translator';

/**
 * REST controller for the networks of a project (`/api/v1/projects/:projectId/networks`).
 */
@Controller('projects/:projectId/networks')
export class ProjectNetworksController {
    constructor(private readonly service: ProjectNetworksService) {}

    @Get()
    public async getByProject(
        @Param('projectId', ParseUUIDPipe) projectId: string,
    ): Promise<ProjectNetworkResponse[]> {
        enrichTelemetry({ 'project.id': projectId });

        try {
            const networks = await this.service.getByProject(projectId);

            return networks.map(toProjectNetworkResponse);
        } catch (error) {
            throw translateError(error);
        }
    }

    @Post()
    public async create(
        @Param('projectId', ParseUUIDPipe) projectId: string,
        @Body(new ZodValidationPipe(createProjectNetworkSchema)) createDto: CreateProjectNetworkDto,
    ): Promise<ProjectNetworkResponse> {
        enrichTelemetry({ 'project.id': projectId });

        try {
            return toProjectNetworkResponse(await this.service.create(projectId, createDto));
        } catch (error) {
            throw translateError(error);
        }
    }

    @Put(':id')
    public async rename(
        @Param('projectId', ParseUUIDPipe) projectId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body(new ZodValidationPipe(updateProjectNetworkSchema)) updateDto: UpdateProjectNetworkDto,
    ): Promise<ProjectNetworkResponse> {
        enrichTelemetry({ 'project.id': projectId });

        try {
            return toProjectNetworkResponse(await this.service.rename(projectId, id, updateDto));
        } catch (error) {
            throw translateError(error);
        }
    }

    @Delete(':id')
    @HttpCode(204)
    public async remove(
        @Param('projectId', ParseUUIDPipe) projectId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<void> {
        enrichTelemetry({ 'project.id': projectId });

        try {
            await this.service.remove(projectId, id);
        } catch (error) {
            throw translateError(error);
        }
    }

    @Post(':id/services')
    @HttpCode(204)
    public async join(
        @Param('projectId', ParseUUIDPipe) projectId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body(new ZodValidationPipe(joinProjectNetworkSchema)) joinDto: JoinProjectNetworkDto,
    ): Promise<void> {
        enrichTelemetry({ 'project.id': projectId, 'service.id': joinDto.serviceId });

        try {
            await this.service.join(projectId, id, joinDto);
        } catch (error) {
            throw translateError(error);
        }
    }

    @Delete(':id/services/:serviceId')
    @HttpCode(204)
    public async leave(
        @Param('projectId', ParseUUIDPipe) projectId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Param('serviceId', ParseUUIDPipe) serviceId: string,
    ): Promise<void> {
        enrichTelemetry({ 'project.id': projectId, 'service.id': serviceId });

        try {
            await this.service.leave(projectId, id, serviceId);
        } catch (error) {
            throw translateError(error);
        }
    }
}
