import { Controller, Delete, HttpCode, Param, ParseUUIDPipe } from '@nestjs/common';

import { UsersService } from '../services/users.service';

import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { translateError } from '@core/ui/translators/http-error.translator';

/**
 * REST controller for the administration of the users (`/api/v1/users`).
 */
@Controller('users')
export class UsersController {
    constructor(private readonly service: UsersService) {}

    /**
     * Turns the second factor of a user off.
     *
     * @param id Identifier of the user the second factor is cleared for
     */
    @Delete(':id/2fa')
    @HttpCode(204)
    public async disableTotp(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        enrichTelemetry({ 'user.id': id });

        try {
            await this.service.disableTotp(id);
        } catch (error) {
            throw translateError(error);
        }
    }
}
