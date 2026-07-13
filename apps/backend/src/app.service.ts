import { Injectable } from '@nestjs/common';

export interface HealthStatus {
    status: 'ok';
}

/**
 * Health check service for the application.
 */
@Injectable()
export class AppService {
    /**
     * Get the health status of the application
     *
     * @returns Health status
     */
    public getHealth(): HealthStatus {
        return { status: 'ok' };
    }
}
