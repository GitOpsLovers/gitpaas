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

import { CreateProjectDto } from '../../domain/dtos/create-project.dto';
import { UpdateProjectDto } from '../../domain/dtos/update-project.dto';
import { Project } from '../../domain/models/project.models';
import { ProjectsService } from '../services/projects.service';

import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { translateError } from '@core/ui/translators/http-error.translator';

/**
 * Projects controller
 */
@Controller('namespaces/:namespaceId/projects')
export class ProjectsController {
    constructor(private readonly service: ProjectsService) {}

    @Get()
    public async getAll(@Param('namespaceId', ParseUUIDPipe) namespaceId: string): Promise<Project[]> {
        enrichTelemetry({ 'namespace.id': namespaceId });

        try {
            return await this.service.getAll(namespaceId);
        } catch (error) {
            throw translateError(error);
        }
    }

    @Get(':id')
    public async findById(
        @Param('namespaceId', ParseUUIDPipe) namespaceId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<Project> {
        enrichTelemetry({ 'namespace.id': namespaceId, 'project.id': id });

        try {
            return await this.service.findById(namespaceId, id);
        } catch (error) {
            throw translateError(error);
        }
    }

    @Post()
    public async create(
        @Param('namespaceId', ParseUUIDPipe) namespaceId: string,
        @Body() createDto: CreateProjectDto,
    ): Promise<Project> {
        try {
            return await this.service.create(namespaceId, createDto);
        } catch (error) {
            throw translateError(error);
        }
    }

    @Put(':id')
    public async update(
        @Param('namespaceId', ParseUUIDPipe) namespaceId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateDto: UpdateProjectDto,
    ): Promise<Project> {
        try {
            return await this.service.update(namespaceId, id, updateDto);
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
