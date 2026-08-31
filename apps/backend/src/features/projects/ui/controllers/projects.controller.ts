import { createProjectSchema, updateProjectSchema } from '@gitpaas/contracts';
import type { CreateProjectDto, Project as ProjectResponse, UpdateProjectDto } from '@gitpaas/contracts';
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

import { ProjectsService } from '../services/projects.service';
import { toProjectResponse } from '../transformers/project-response.transformer';

import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { ZodValidationPipe } from '@core/ui/pipes/zod-validation.pipe';
import { translateError } from '@core/ui/translators/http-error.translator';

/**
 * Projects controller
 */
@Controller('namespaces/:namespaceId/projects')
export class ProjectsController {
    constructor(private readonly service: ProjectsService) {}

    @Get()
    public async getAll(@Param('namespaceId', ParseUUIDPipe) namespaceId: string): Promise<ProjectResponse[]> {
        enrichTelemetry({ 'namespace.id': namespaceId });

        try {
            const projects = await this.service.getAll(namespaceId);

            return projects.map(toProjectResponse);
        } catch (error) {
            throw translateError(error);
        }
    }

    @Get(':id')
    public async findById(
        @Param('namespaceId', ParseUUIDPipe) namespaceId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<ProjectResponse> {
        enrichTelemetry({ 'namespace.id': namespaceId, 'project.id': id });

        try {
            return toProjectResponse(await this.service.findById(namespaceId, id));
        } catch (error) {
            throw translateError(error);
        }
    }

    @Post()
    public async create(
        @Param('namespaceId', ParseUUIDPipe) namespaceId: string,
        @Body(new ZodValidationPipe(createProjectSchema)) createDto: CreateProjectDto,
    ): Promise<ProjectResponse> {
        try {
            return toProjectResponse(await this.service.create(namespaceId, createDto));
        } catch (error) {
            throw translateError(error);
        }
    }

    @Put(':id')
    public async update(
        @Param('namespaceId', ParseUUIDPipe) namespaceId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body(new ZodValidationPipe(updateProjectSchema)) updateDto: UpdateProjectDto,
    ): Promise<ProjectResponse> {
        try {
            return toProjectResponse(await this.service.update(namespaceId, id, updateDto));
        } catch (error) {
            throw translateError(error);
        }
    }

    @Delete(':id')
    @HttpCode(204)
    public async delete(
        @Param('namespaceId', ParseUUIDPipe) namespaceId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<void> {
        enrichTelemetry({ 'namespace.id': namespaceId, 'project.id': id });

        try {
            await this.service.delete(namespaceId, id);
        } catch (error) {
            throw translateError(error);
        }
    }
}
