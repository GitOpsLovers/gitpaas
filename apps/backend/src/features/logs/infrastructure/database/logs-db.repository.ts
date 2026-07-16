import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateLogDto } from '../../domain/dtos/create-log.dto';
import { UpdateLogDto } from '../../domain/dtos/update-log.dto';
import { Log } from '../../domain/models/log.model';
import { LogsRepository } from '../../domain/repositories/logs.repository';

import { LogDbEntity } from './log-db.entity';
import { toLog } from './logs-db.transformer';

/**
 * Logs database repository
 */
@Injectable()
export class LogsDatabaseRepository implements LogsRepository {
    constructor(
        @InjectRepository(LogDbEntity)
        private readonly repository: Repository<LogDbEntity>,
    ) {}

    public async getAllByDeployment(deploymentId: string): Promise<Log[]> {
        const logs = await this.repository.find({ where: { deploymentId }, order: { seq: 'ASC' } });

        return logs.map(toLog);
    }

    public async findById(id: string): Promise<Log | null> {
        const log = await this.repository.findOneBy({ id });

        if (!log) {
            return null;
        }

        return toLog(log);
    }

    public async create(createDto: CreateLogDto): Promise<Log> {
        const entity = this.repository.create(createDto);
        const saved = await this.repository.save(entity);

        return toLog(saved);
    }

    public async createMany(createDtos: CreateLogDto[]): Promise<Log[]> {
        const entities = this.repository.create(createDtos);
        const saved = await this.repository.save(entities);

        return saved.map(toLog);
    }

    public async update(id: string, updateDto: UpdateLogDto): Promise<Log | null> {
        const log = await this.repository.findOneBy({ id });

        if (!log) {
            return null;
        }

        this.repository.merge(log, updateDto);
        const saved = await this.repository.save(log);

        return toLog(saved);
    }

    public async delete(id: string): Promise<boolean> {
        const result = await this.repository.delete(id);

        return (result.affected ?? 0) > 0;
    }
}
