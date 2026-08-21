import type { LogEvent } from '@gitpaas/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

import { getLogsByDeploymentUseCase } from '../../application/get-logs-by-deployment.use-case';
import { LogEntry } from '../../domain/models/log-entry.models';
import type { LogStore } from '../../domain/ports/log-store.port';
import type { LogsRepository } from '../../domain/repositories/logs.repository';
import { DatabaseLogsRepository } from '../../infrastructure/database/db-logs.repository';
import { RedisLogStoreAdapter } from '../../infrastructure/redis/redis-log-store.adapter';

import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';

/**
 * Logs service
 */
@Injectable()
export class LogsService {
    constructor(
        @Inject(DatabaseLogsRepository)
        private readonly repository: LogsRepository,
        @Inject(RedisLogStoreAdapter)
        private readonly logStore: LogStore,
    ) {}

    /**
     * Get every log entry of a deployment, oldest first
     *
     * @param deploymentId Deployment identifier
     *
     * @returns Ordered log entries of the deployment
     */
    public async getAllByDeployment(deploymentId: string): Promise<LogEntry[]> {
        const entries = await getLogsByDeploymentUseCase(this.repository, deploymentId);

        enrichTelemetry({ 'deployment.log_lines': entries.length });

        return entries;
    }

    /**
     * Streams a deployment's log: buffered lines first, then live output.
     *
     * @param deploymentId Deployment identifier
     *
     * @returns Observable of log events for the deployment
     */
    public streamLogs(deploymentId: string): Observable<LogEvent> {
        return this.logStore.stream(deploymentId);
    }
}
