import type { LogEvent } from '@gitpaas/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

import { getLogsByDeploymentUseCase } from '../../application/get-logs-by-deployment.use-case';
import { LogArchive } from '../../domain/models/log-entry.models';
import type { LogStore } from '../../domain/ports/log-store.port';
import type { LogsRepository } from '../../domain/repositories/logs.repository';
import { DatabaseLogsRepository } from '../../infrastructure/database/db-logs.repository';
import { RedisLogStoreAdapter } from '../../infrastructure/redis/redis-log-store.adapter';

import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import type { DeploymentsRepository } from '@features/deployments/domain/repositories/deployments.repository';
import { DatabaseDeploymentsRepository } from '@features/deployments/infrastructure/database/db-deployments.repository';

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
        @Inject(DatabaseDeploymentsRepository)
        private readonly deploymentsRepository: DeploymentsRepository,
    ) {}

    /**
     * Get the archived output of a deployment, oldest first, with the reason an empty list is empty
     *
     * @param deploymentId Deployment identifier
     *
     * @returns Ordered log entries of the deployment, and the state of its archive
     */
    public async getAllByDeployment(deploymentId: string): Promise<LogArchive> {
        const archive = await getLogsByDeploymentUseCase(this.repository, this.deploymentsRepository, deploymentId);

        enrichTelemetry({ 'deployment.log_lines': archive.entries.length });

        return archive;
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
