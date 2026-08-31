import type { PlatformSettings } from '@gitpaas/contracts';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PlatformSettingsRepository } from '../../domain/repositories/platform-settings.repository';

import { DbPlatformSettingsEntity, PLATFORM_SETTINGS_ROW_ID } from './db-platform-settings.entity';
import { toPlatformSettings } from './db-platform-settings.transformer';

/**
 * Platform settings database repository
 */
@Injectable()
export class DatabasePlatformSettingsRepository implements PlatformSettingsRepository {
    constructor(
        @InjectRepository(DbPlatformSettingsEntity)
        private readonly repository: Repository<DbPlatformSettingsEntity>,
    ) {}

    public async find(): Promise<PlatformSettings | null> {
        const entity = await this.repository.findOneBy({ id: PLATFORM_SETTINGS_ROW_ID });

        return entity ? toPlatformSettings(entity) : null;
    }

    public async save(settings: PlatformSettings): Promise<PlatformSettings> {
        const entity = await this.repository.save({
            id: PLATFORM_SETTINGS_ROW_ID,
            logRetentionDays: settings.logRetentionDays,
            gitpaasDomain: settings.gitpaasDomain ?? null,
        });

        return toPlatformSettings(entity);
    }
}
