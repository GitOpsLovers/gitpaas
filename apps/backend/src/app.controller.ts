import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';
import type { HealthStatus } from './app.service';

@Controller()

/**
 * Main application controller
 */
export class AppController {
    constructor(private readonly appService: AppService) {}

    /**
     * Get the health status of the application
     *
     * @returns Health status
     */
    @Get()
    public getHealth(): HealthStatus {
        return this.appService.getHealth();
    }
}
