import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DbLogEntity } from './infrastructure/database/db-log.entity';
import { DatabaseLogsRepository } from './infrastructure/database/db-logs.repository';
import { RedisLogStoreAdapter } from './infrastructure/redis/redis-log-store.adapter';
import { LogsController } from './ui/controllers/logs.controller';
import { LogsService } from './ui/services/logs.service';

/**
 * Logs feature module.
 */
@Module({
    imports: [TypeOrmModule.forFeature([DbLogEntity])],
    controllers: [LogsController],
    providers: [
        LogsService,
        DatabaseLogsRepository,
        RedisLogStoreAdapter,
    ],
    exports: [RedisLogStoreAdapter],
})
export class LogsModule {}
