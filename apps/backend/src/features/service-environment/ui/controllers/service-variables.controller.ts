import { setServiceVariableSchema, updateServiceVariableSchema } from '@gitpaas/contracts';
import type { SetServiceVariableDto, UpdateServiceVariableDto } from '@gitpaas/contracts';
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

import { ServiceVariable } from '../../domain/models/service-variable.models';
import { ServiceVariablesService } from '../services/service-variables.service';

import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { ZodValidationPipe } from '@core/ui/pipes/zod-validation.pipe';
import { translateError } from '@core/ui/translators/http-error.translator';

/**
 * REST controller for the variables of a service (`/api/v1/services/:serviceId/variables`).
 */
@Controller('services/:serviceId/variables')
export class ServiceVariablesController {
    constructor(private readonly service: ServiceVariablesService) {}

    @Get()
    public async getByService(
        @Param('serviceId', ParseUUIDPipe) serviceId: string,
    ): Promise<ServiceVariable[]> {
        enrichTelemetry({ 'service.id': serviceId });

        try {
            return await this.service.getByService(serviceId);
        } catch (error) {
            throw translateError(error);
        }
    }

    @Post()
    public async set(
        @Param('serviceId', ParseUUIDPipe) serviceId: string,
        @Body(new ZodValidationPipe(setServiceVariableSchema)) setDto: SetServiceVariableDto,
    ): Promise<ServiceVariable> {
        enrichTelemetry({ 'service.id': serviceId });

        try {
            return await this.service.set(serviceId, setDto);
        } catch (error) {
            throw translateError(error);
        }
    }

    @Put(':id')
    public async update(
        @Param('serviceId', ParseUUIDPipe) serviceId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body(new ZodValidationPipe(updateServiceVariableSchema)) updateDto: UpdateServiceVariableDto,
    ): Promise<ServiceVariable> {
        enrichTelemetry({ 'service.id': serviceId });

        try {
            return await this.service.update(serviceId, id, updateDto);
        } catch (error) {
            throw translateError(error);
        }
    }

    @Delete(':id')
    @HttpCode(204)
    public async remove(
        @Param('serviceId', ParseUUIDPipe) serviceId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<void> {
        enrichTelemetry({ 'service.id': serviceId });

        try {
            await this.service.remove(serviceId, id);
        } catch (error) {
            throw translateError(error);
        }
    }
}
