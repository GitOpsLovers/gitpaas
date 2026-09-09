import { createServiceSchema, updateServiceSchema } from '@gitpaas/contracts';
import type {
    CreateServiceDto,
    FinalCompose as FinalComposeResponse,
    Service as ServiceResponse,
    UpdateServiceDto,
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

        try {
            return toServiceResponse(await this.service.findById(id));
        } catch (error) {
            throw translateError(error);
        }
    }

    /**
     * Answer the final Compose file of a service, and the origin of its text.
     *
     * @param id Service identifier
     *
     * @returns The Compose text, masked of the value of every variable, and its origin
     */
    @Get(':id/final-compose')
    public async getFinalCompose(@Param('id', ParseUUIDPipe) id: string): Promise<FinalComposeResponse> {
        enrichTelemetry({ 'service.id': id });

        try {
            return await this.service.getFinalCompose(id);
        } catch (error) {
            throw translateError(error);
        }
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

        try {
            return toServiceResponse(await this.service.update(id, updateDto));
        } catch (error) {
            throw translateError(error);
        }
    }

    /**
     * Read the compose file of the repository of a service again, and cache the names and the values of its key `environment`.
     *
     * @param id Service identifier
     */
    @Post(':id/compose-environment/refresh')
    @HttpCode(204)
    public async refreshComposeEnvironment(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        enrichTelemetry({ 'service.id': id });

        try {
            await this.service.refreshComposeEnvironment(id);
        } catch (error) {
            throw translateError(error);
        }
    }

    /**
     * Read the compose file of the repository of a service again, and cache the domains its key `x-gitpaas-domain` declares.
     *
     * @param id Service identifier
     */
    @Post(':id/compose-domains/refresh')
    @HttpCode(204)
    public async refreshComposeDomains(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        enrichTelemetry({ 'service.id': id });

        try {
            await this.service.refreshComposeDomains(id);
        } catch (error) {
            throw translateError(error);
        }
    }

    @Delete(':id')
    @HttpCode(204)
    public async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        enrichTelemetry({ 'service.id': id });

        try {
            await this.service.delete(id);
        } catch (error) {
            throw translateError(error);
        }
    }
}
