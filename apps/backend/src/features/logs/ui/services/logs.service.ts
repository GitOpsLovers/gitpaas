import { Inject, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

import { createLogUseCase } from '../../application/create-log.use-case';
import { deleteLogUseCase } from '../../application/delete-log.use-case';
import { findLogByIdUseCase } from '../../application/find-log-by-id.use-case';
import { getLogsByDeploymentUseCase } from '../../application/get-logs-by-deployment.use-case';
import { updateLogUseCase } from '../../application/update-log.use-case';
import { CreateLogDto } from '../../domain/dtos/create-log.dto';
import { UpdateLogDto } from '../../domain/dtos/update-log.dto';
import { LogEvent } from '../../domain/models/log-event.model';
import { Log } from '../../domain/models/log.model';
import { LogsDatabaseRepository } from '../../infrastructure/database/logs-db.repository';
import { RedisLogStoreRepository } from '../../infrastructure/redis/redis-log-store.repository';

/**
 * Logs service
 */
@Injectable()
export class LogsService {
    constructor(
        @Inject(LogsDatabaseRepository)
        private readonly repository: LogsDatabaseRepository,
        @Inject(RedisLogStoreRepository)
        private readonly logStoreRepository: RedisLogStoreRepository,
    ) {}

    /**
     * Get every log entry of a deployment, oldest first
     *
     * @param deploymentId Deployment identifier
     *
     * @returns Ordered log entries of the deployment
     */
    public getAllByDeployment(deploymentId: string): Promise<Log[]> {
        return getLogsByDeploymentUseCase(this.repository, deploymentId);
    }

    /**
     * Find a single log entry by its identifier
     *
     * @param id Log entry identifier
     *
     * @returns The log entry, or `null` when it does not exist
     */
    public findById(id: string): Promise<Log | null> {
        return findLogByIdUseCase(this.repository, id);
    }

    /**
     * Persist a new log entry
     *
     * @param createDto Log entry data
     *
     * @returns The created log entry
     */
    public create(createDto: CreateLogDto): Promise<Log> {
        return createLogUseCase(this.repository, createDto);
    }

    /**
     * Update a log entry's content
     *
     * @param id Log entry identifier
     * @param updateDto New content
     *
     * @returns The updated log entry, or `null` when it does not exist
     */
    public update(id: string, updateDto: UpdateLogDto): Promise<Log | null> {
        return updateLogUseCase(this.repository, id, updateDto);
    }

    /**
     * Delete a log entry
     *
     * @param id Log entry identifier
     *
     * @returns `true` when a row was deleted, `false` otherwise
     */
    public delete(id: string): Promise<boolean> {
        return deleteLogUseCase(this.repository, id);
    }

    /**
     * Streams a deployment's log: buffered lines first, then live output.
     *
     * @param deploymentId Deployment identifier
     *
     * @returns Observable of log events for the deployment
     */
    public streamLogs(deploymentId: string): Observable<LogEvent> {
        return this.logStoreRepository.stream(deploymentId);
    }
}
