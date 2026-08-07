import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateLogDto } from '../../domain/dtos/create-log.dto';
import { UpdateLogDto } from '../../domain/dtos/update-log.dto';
import { Log } from '../../domain/models/log.models';
import { LogsRepository } from '../../domain/repositories/logs.repository';

import { DbLogEntity } from './db-log.entity';
import { toLog } from './db-logs.transformer';

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
    public async getAllByDeployment(deploymentId: string): Promise<Log[]> {
        const logs = await this.repository.find({ where: { deploymentId }, order: { seq: 'ASC' } });

        return logs.map(toLog);
    }

    /**
     * Find a single log entry by its identifier
     *
     * @param id Log entry identifier
     *
     * @returns The log entry, or `null` when it does not exist
     */
    public async findById(id: string): Promise<Log | null> {
        const log = await this.repository.findOneBy({ id });

        if (!log) {
            return null;
        }

        return toLog(log);
    }

    /**
     * Persist a single log entry
     *
     * @param createDto Data for the log entry
     *
     * @returns The created log entry
     */
    public async create(createDto: CreateLogDto): Promise<Log> {
        const entity = this.repository.create(createDto);
        const saved = await this.repository.save(entity);

        return toLog(saved);
    }

    /**
     * Persist several log entries in one write
     *
     * @param createDtos Data for the log entries
     *
     * @returns The created log entries
     */
    public async createMany(createDtos: CreateLogDto[]): Promise<Log[]> {
        const entities = this.repository.create(createDtos);
        const saved = await this.repository.save(entities);

        return saved.map(toLog);
    }

    /**
     * Update a log entry's content
     *
     * @param id Log entry identifier
     * @param updateDto New content
     *
     * @returns The updated log entry, or `null` when it does not exist
     */
    public async update(id: string, updateDto: UpdateLogDto): Promise<Log | null> {
        const log = await this.repository.findOneBy({ id });

        if (!log) {
            return null;
        }

        this.repository.merge(log, updateDto);
        const saved = await this.repository.save(log);

        return toLog(saved);
    }

    /**
     * Delete a log entry
     *
     * @param id Log entry identifier
     *
     * @returns `true` when a row was deleted, `false` otherwise
     */
    public async delete(id: string): Promise<boolean> {
        const result = await this.repository.delete(id);

        return (result.affected ?? 0) > 0;
    }
}
