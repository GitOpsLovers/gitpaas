import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, LessThanOrEqual, Repository } from 'typeorm';

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
    constructor(
        @InjectRepository(DbLogEntity)
        private readonly repository: Repository<DbLogEntity>,
    ) {}

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
     * Highest sequence already persisted for a deployment
     *
     * @param deploymentId Deployment identifier
     *
     * @returns Highest stored sequence, or `0` when the deployment has no entries
     */
    public async getMaxSeq(deploymentId: string): Promise<number> {
        const last = await this.repository.findOne({
            where: { deploymentId },
            order: { seq: 'DESC' },
            select: { seq: true },
        });

        return last?.seq ?? 0;
    }

    /**
     * Delete every log entry of a deployment
     *
     * @param deploymentId Deployment identifier
     */
    public async deleteByDeployment(deploymentId: string): Promise<void> {
        await this.repository.delete({ deploymentId });
    }

    /**
     * Delete a deployment's log entries up to and including a sequence
     *
     * @param deploymentId Deployment identifier
     * @param seq Highest sequence to delete
     */
    public async deleteUpToSeq(deploymentId: string, seq: number): Promise<void> {
        await this.repository.delete({ deploymentId, seq: LessThanOrEqual(seq) });
    }

    /**
     * Delete every log entry created before an instant
     *
     * @param threshold Instant before which entries are dropped
     */
    public async deleteCreatedBefore(threshold: Date): Promise<void> {
        await this.repository.delete({ createdAt: LessThan(threshold) });
    }
}
