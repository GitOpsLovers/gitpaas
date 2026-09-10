import type { Volume as VolumeResponse } from '@gitpaas/contracts';
import { Controller, Get, Param, ParseUUIDPipe, ServiceUnavailableException } from '@nestjs/common';

import { VolumesService } from '../services/volumes.service';
import { toVolumeResponse } from '../transformers/volume-response.transformer';

import { DaemonUnreachableError } from '@core/domain/errors/container-runtime.errors';
import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
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
            if (error instanceof DaemonUnreachableError) {
                throw new ServiceUnavailableException(
                    'Could not reach the server Docker daemon. Verify the server is running and reachable.',
                    { cause: error },
                );
            }

            throw translateError(error);
        }
    }
}
