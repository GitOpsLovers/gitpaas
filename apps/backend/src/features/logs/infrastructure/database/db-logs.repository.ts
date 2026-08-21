import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';

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

    public async getAllByDeployment(deploymentId: string): Promise<LogEntry[]> {
        const logs = await this.repository.find({ where: { deploymentId }, order: { seq: 'ASC' } });

        return logs.map(toLogEntry);
    }

    public async createMany(createDtos: CreateLogDto[]): Promise<void> {
        const entities = this.repository.create(createDtos);

        await this.repository.save(entities);
    }

    public async deleteByDeployment(deploymentId: string): Promise<void> {
        await this.repository.delete({ deploymentId });
    }

    public async deleteCreatedBefore(threshold: Date, limit: number): Promise<number> {
        const expired = await this.repository.find({
            select: { id: true },
            where: { createdAt: LessThan(threshold) },
            order: { createdAt: 'ASC' },
            take: limit,
        });

        if (expired.length === 0) {
            return 0;
        }

        const result = await this.repository.delete({ id: In(expired.map((entry) => entry.id)) });

        return result.affected ?? expired.length;
    }
}
