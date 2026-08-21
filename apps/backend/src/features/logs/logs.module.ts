import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DbLogEntity } from './infrastructure/database/db-log.entity';
import { DatabaseLogsRepository } from './infrastructure/database/db-logs.repository';
import { RedisLogStoreAdapter } from './infrastructure/redis/redis-log-store.adapter';
import { LogsController } from './ui/controllers/logs.controller';
import { RemoveExpiredLogsJob } from './ui/jobs/remove-expired-logs.job';
import { LogsService } from './ui/services/logs.service';

import { DbPlatformSettingsEntity } from '@features/server/infrastructure/database/db-platform-settings.entity';
import { DatabasePlatformSettingsRepository } from '@features/server/infrastructure/database/db-platform-settings.repository';

/**
 * Logs feature module.
 */
@Module({
    imports: [TypeOrmModule.forFeature([DbLogEntity, DbPlatformSettingsEntity])],
    controllers: [LogsController],
    providers: [
        LogsService,
        DatabaseLogsRepository,
        DatabasePlatformSettingsRepository,
        RedisLogStoreAdapter,
        RemoveExpiredLogsJob,
    ],
    exports: [RedisLogStoreAdapter],
})
export class LogsModule {}
