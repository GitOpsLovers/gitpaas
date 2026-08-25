import { claimDomainSchema, updateDomainSchema } from '@gitpaas/contracts';
import type { ClaimDomainDto, UpdateDomainDto } from '@gitpaas/contracts';
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

import { Domain } from '../../domain/models/domain.models';
import { DomainsService } from '../services/domains.service';

import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { ZodValidationPipe } from '@core/ui/pipes/zod-validation.pipe';
import { translateError } from '@core/ui/translators/http-error.translator';

/**
 * REST controller for the domains of a service (`/api/v1/services/:serviceId/domains`).
 */
@Controller('services/:serviceId/domains')
export class DomainsController {
    constructor(private readonly service: DomainsService) {}

    @Get()
    public async getByService(
        @Param('serviceId', ParseUUIDPipe) serviceId: string,
    ): Promise<Domain[]> {
        enrichTelemetry({ 'service.id': serviceId });

        try {
            return await this.service.getByService(serviceId);
        } catch (error) {
            throw translateError(error);
        }
    }

    @Post()
    public async claim(
        @Param('serviceId', ParseUUIDPipe) serviceId: string,
        @Body(new ZodValidationPipe(claimDomainSchema)) claimDto: ClaimDomainDto,
    ): Promise<Domain> {
        enrichTelemetry({ 'service.id': serviceId });

        try {
            return await this.service.claim(serviceId, claimDto);
        } catch (error) {
            throw translateError(error);
        }
    }

    @Put(':id')
    public async update(
        @Param('serviceId', ParseUUIDPipe) serviceId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body(new ZodValidationPipe(updateDomainSchema)) updateDto: UpdateDomainDto,
    ): Promise<Domain> {
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
