import { createServiceSchema, updateServiceSchema } from '@gitpaas/contracts';
import type { CreateServiceDto, Service as ServiceResponse, UpdateServiceDto } from '@gitpaas/contracts';
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

import { ServicesService } from '../services/services.service';
import { toServiceResponse } from '../transformers/service-response.transformer';

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
    public async getAllByProject(@Query('projectId', ParseUUIDPipe) projectId: string): Promise<ServiceResponse[]> {
        enrichTelemetry({ 'project.id': projectId });

        const services = await this.service.getAllByProject(projectId);

        return services.map(toServiceResponse);
    }

    @Get(':id')
    public async findById(@Param('id', ParseUUIDPipe) id: string): Promise<ServiceResponse> {
        enrichTelemetry({ 'service.id': id });

        const service = await this.service.findById(id);

        if (!service) {
            throw new NotFoundException(`Service ${id} not found`);
        }

        return toServiceResponse(service);
    }

    /**
     * Create a service inside a project.
     *
     * @param createDto Data for creating the service
     *
     * @returns Created service
     */
    @Post()
    public async create(@Body(new ZodValidationPipe(createServiceSchema)) createDto: CreateServiceDto): Promise<ServiceResponse> {
        try {
            return toServiceResponse(await this.service.create(createDto));
        } catch (error) {
            throw translateError(error);
        }
    }

    @Put(':id')
    public async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body(new ZodValidationPipe(updateServiceSchema)) updateDto: UpdateServiceDto,
    ): Promise<ServiceResponse> {
        enrichTelemetry({ 'service.id': id });

        const service = await this.service.update(id, updateDto);

        if (!service) {
            throw new NotFoundException(`Service ${id} not found`);
        }

        return toServiceResponse(service);
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
