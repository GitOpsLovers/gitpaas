import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, MoreThanOrEqual, Repository } from 'typeorm';

import { CreateRuntimeLogDto } from '../../domain/dtos/create-runtime-log.dto';
import { RuntimeLogEntry, RuntimeLogReadOptions } from '../../domain/models/runtime-log.models';
import { RuntimeLogsRepository } from '../../domain/repositories/runtime-logs.repository';

import { DbRuntimeLogEntity } from './db-runtime-log.entity';
import { toRuntimeLogEntry } from './db-runtime-logs.transformer';

/**
 * Runtime logs database repository
 */
@Injectable()
export class DatabaseRuntimeLogsRepository implements RuntimeLogsRepository {
    constructor(@InjectRepository(DbRuntimeLogEntity) private readonly repository: Repository<DbRuntimeLogEntity>) {}

    public async createMany(createDtos: CreateRuntimeLogDto[]): Promise<void> {
        const entities = this.repository.create(createDtos);

        await this.repository.save(entities);
    }

    public async getByContainer(containerId: string, options: RuntimeLogReadOptions = {}): Promise<RuntimeLogEntry[]> {
        const where = {
            containerId,
            ...(options.since ? { timestamp: MoreThanOrEqual(options.since) } : {}),
        };

        if (options.tail === undefined) {
            const lines = await this.repository.find({ where, order: { id: 'ASC' } });

            return lines.map(toRuntimeLogEntry);
        }

        const lastLines = await this.repository.find({ where, order: { id: 'DESC' }, take: options.tail });

        return lastLines.reverse().map(toRuntimeLogEntry);
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
