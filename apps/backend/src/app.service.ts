import { Injectable } from '@nestjs/common';

export interface HealthStatus {
    status: 'ok';
}

@Injectable()

/**
 * Health check service for the application.
 */
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
