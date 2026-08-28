import type { PlatformUpdate } from '@gitpaas/contracts';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UPDATE_INITIAL_STEP } from '../../domain/constants/platform-update.constants';
import { PlatformUpdatesRepository } from '../../domain/repositories/platform-updates.repository';

import { DbPlatformUpdateEntity } from './db-platform-update.entity';
import { toPlatformUpdate } from './db-platform-updates.transformer';

/**
 * Platform updates database repository
 */
@Injectable()
export class DatabasePlatformUpdatesRepository implements PlatformUpdatesRepository {
    constructor(
        @InjectRepository(DbPlatformUpdateEntity)
        private readonly repository: Repository<DbPlatformUpdateEntity>,
    ) {}

    public async findLast(): Promise<PlatformUpdate | null> {
        const entity = await this.repository.findOne({ where: {}, order: { startedAt: 'DESC' } });

        return entity ? toPlatformUpdate(entity) : null;
    }

    public async open(targetVersion: string): Promise<PlatformUpdate> {
        const entity = await this.repository.save({
            targetVersion,
            step: UPDATE_INITIAL_STEP,
            percent: 0,
            state: 'running' as const,
            error: null,
        });

        return toPlatformUpdate(entity);
    }
}
