import { createServiceSchema, updateServiceSchema } from '@gitpaas/contracts';
import type { CreateServiceDto, UpdateServiceDto } from '@gitpaas/contracts';
import {
    // eslint-disable-next-line @typescript-eslint/no-redeclare
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    NotFoundException,
    Param,
    ParseUUIDPipe,
    Post,
    Put,
    Query,
} from '@nestjs/common';

import { Service } from '../../domain/models/service.models';
import { ServicesService } from '../services/services.service';

import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { ZodValidationPipe } from '@core/ui/pipes/zod-validation.pipe';
import { translateError } from '@core/ui/translators/http-error.translator';

/**
 * REST controller for the services resource (`/api/v1/services`).
 */
@Controller('services')
export class ServicesController {
    constructor(private readonly service: ServicesService) {}

    @Get()
    public getAllByProject(@Query('projectId', ParseUUIDPipe) projectId: string): Promise<Service[]> {
        enrichTelemetry({ 'project.id': projectId });

        return this.service.getAllByProject(projectId);
    }

    @Get(':id')
    public async findById(@Param('id', ParseUUIDPipe) id: string): Promise<Service> {
        enrichTelemetry({ 'service.id': id });

        const service = await this.service.findById(id);

        if (!service) {
            throw new NotFoundException(`Service ${id} not found`);
        }

        return service;
    }

    /**
     * Create a service inside a project.
     *
     * @param createDto Data for creating the service
     *
     * @returns Created service
     */
    @Post()
    public async create(@Body(new ZodValidationPipe(createServiceSchema)) createDto: CreateServiceDto): Promise<Service> {
        try {
            return await this.service.create(createDto);
        } catch (error) {
            throw translateError(error);
        }
    }

    @Put(':id')
    public async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body(new ZodValidationPipe(updateServiceSchema)) updateDto: UpdateServiceDto,
    ): Promise<Service> {
        enrichTelemetry({ 'service.id': id });

        const service = await this.service.update(id, updateDto);

        if (!service) {
            throw new NotFoundException(`Service ${id} not found`);
        }

        return service;
    }

    @Delete(':id')
    @HttpCode(204)
    public async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        enrichTelemetry({ 'service.id': id });

        const deleted = await this.service.delete(id);

        if (!deleted) {
            throw new NotFoundException(`Service ${id} not found`);
        }
    }
}
