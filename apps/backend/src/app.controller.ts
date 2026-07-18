import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';
import type { HealthStatus } from './app.service';

import { Public } from '@features/authentication/ui/decorators/public.decorator';

/**
 * Main application controller
 */
@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

    /**
     * Get the health status of the application
     *
     * @returns Health status
     */
    @Public()
    @Get()
    public getHealth(): HealthStatus {
        return this.appService.getHealth();
    }
}
