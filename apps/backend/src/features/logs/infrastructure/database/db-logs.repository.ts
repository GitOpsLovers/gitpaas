import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateLogDto } from '../../domain/dtos/create-log.dto';
import { LogEntry } from '../../domain/models/log-entry.models';
import { LogsRepository } from '../../domain/repositories/logs.repository';

import { DbLogEntity } from './db-log.entity';
import { toLogEntry } from './db-logs.transformer';

/**
 * Logs database repository
 */
@Injectable()
export class DatabaseLogsRepository implements LogsRepository {
    constructor(@InjectRepository(DbLogEntity) private readonly repository: Repository<DbLogEntity>) {}

    /**
     * Get every log entry of a deployment, oldest first
     *
     * @param deploymentId Deployment identifier
     *
     * @returns Ordered log entries of the deployment
     */
    public async getAllByDeployment(deploymentId: string): Promise<LogEntry[]> {
        const logs = await this.repository.find({ where: { deploymentId }, order: { seq: 'ASC' } });

        return logs.map(toLogEntry);
    }

    /**
     * Persist several log entries in one write
     *
     * @param createDtos Data for the log entries
     */
    public async createMany(createDtos: CreateLogDto[]): Promise<void> {
        const entities = this.repository.create(createDtos);

        await this.repository.save(entities);
    }

    /**
     * Delete every log entry of a deployment
     *
     * @param deploymentId Deployment identifier
     */
    public async deleteByDeployment(deploymentId: string): Promise<void> {
        await this.repository.delete({ deploymentId });
    }
}
