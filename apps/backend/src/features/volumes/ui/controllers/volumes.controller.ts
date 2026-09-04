import { attachVolumeSchema, createVolumeSchema, updateVolumeSchema } from '@gitpaas/contracts';
import type {
    AttachVolumeDto,
    CreateVolumeDto,
    UpdateVolumeDto,
    Volume as VolumeResponse,
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
    ServiceUnavailableException,
} from '@nestjs/common';

import { VolumesService } from '../services/volumes.service';
import { toVolumeResponse } from '../transformers/volume-response.transformer';

import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { ZodValidationPipe } from '@core/ui/pipes/zod-validation.pipe';
import { translateError } from '@core/ui/translators/http-error.translator';

/**
 * REST controller for the volumes of a service (`/api/v1/services/:serviceId/volumes`).
 */
@Controller('services/:serviceId/volumes')
export class VolumesController {
    constructor(private readonly service: VolumesService) {}

    @Get()
    public async getByService(
        @Param('serviceId', ParseUUIDPipe) serviceId: string,
    ): Promise<VolumeResponse[]> {
        enrichTelemetry({ 'service.id': serviceId });

        try {
            const volumes = await this.service.getByService(serviceId);

            return volumes.map(toVolumeResponse);
        } catch (error) {
            throw translateError(error, () => new ServiceUnavailableException(
                'Could not reach the server Docker daemon. Verify the server is running and reachable',
                { cause: error },
            ));
        }
    }

    @Post()
    public async create(
        @Param('serviceId', ParseUUIDPipe) serviceId: string,
        @Body(new ZodValidationPipe(createVolumeSchema)) createDto: CreateVolumeDto,
    ): Promise<VolumeResponse> {
        enrichTelemetry({ 'service.id': serviceId });

        try {
            return toVolumeResponse(await this.service.create(serviceId, createDto));
        } catch (error) {
            throw translateError(error);
        }
    }

    @Put(':id')
    public async rename(
        @Param('serviceId', ParseUUIDPipe) serviceId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body(new ZodValidationPipe(updateVolumeSchema)) updateDto: UpdateVolumeDto,
    ): Promise<VolumeResponse> {
        enrichTelemetry({ 'service.id': serviceId });

        try {
            return toVolumeResponse(await this.service.rename(serviceId, id, updateDto));
        } catch (error) {
            throw translateError(error);
        }
    }

    @Put(':id/mount')
    @HttpCode(204)
    public async attach(
        @Param('serviceId', ParseUUIDPipe) serviceId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body(new ZodValidationPipe(attachVolumeSchema)) attachDto: AttachVolumeDto,
    ): Promise<void> {
        enrichTelemetry({ 'service.id': serviceId });

        try {
            await this.service.attach(serviceId, id, attachDto);
        } catch (error) {
            throw translateError(error);
        }
    }

    @Delete(':id/mount')
    @HttpCode(204)
    public async detach(
        @Param('serviceId', ParseUUIDPipe) serviceId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<void> {
        enrichTelemetry({ 'service.id': serviceId });

        try {
            await this.service.detach(serviceId, id);
        } catch (error) {
            throw translateError(error);
        }
    }
}
