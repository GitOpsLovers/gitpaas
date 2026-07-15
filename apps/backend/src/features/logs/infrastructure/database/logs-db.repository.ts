import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateLogDto } from '../../domain/dtos/create-log.dto';
import { UpdateLogDto } from '../../domain/dtos/update-log.dto';
import { Log } from '../../domain/models/log.model';
import { LogsRepository } from '../../domain/repositories/logs.repository';

import { LogDbEntity } from './log-db.entity';

/**
 * Logs database repository
 */
@Injectable()
export class LogsDatabaseRepository implements LogsRepository {
    constructor(
        @InjectRepository(LogDbEntity)
        private readonly repository: Repository<LogDbEntity>,
    ) {}

    public getAllByDeployment(deploymentId: string): Promise<Log[]> {
        return this.repository.find({ where: { deploymentId }, order: { seq: 'ASC' } });
    }

    public findById(id: string): Promise<Log | null> {
        return this.repository.findOneBy({ id });
    }

    public create(createDto: CreateLogDto): Promise<Log> {
        const entity = this.repository.create(createDto);

        return this.repository.save(entity);
    }

    public createMany(createDtos: CreateLogDto[]): Promise<Log[]> {
        const entities = this.repository.create(createDtos);

        return this.repository.save(entities);
    }

    public async update(id: string, updateDto: UpdateLogDto): Promise<Log | null> {
        const log = await this.repository.findOneBy({ id });

        if (!log) {
            return null;
        }

        this.repository.merge(log, updateDto);

        return this.repository.save(log);
    }

    public async delete(id: string): Promise<boolean> {
        const result = await this.repository.delete(id);

        return (result.affected ?? 0) > 0;
    }
}
