import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DbLogEntity } from './infrastructure/database/db-log.entity';
import { DatabaseLogsRepository } from './infrastructure/database/db-logs.repository';
import { PersistentLogStoreRepository } from './infrastructure/log-store/log-store-persistent.repository';
import { RedisLogStoreAdapter } from './infrastructure/redis/redis-log-store.adapter';
import { LogsController } from './ui/controllers/logs.controller';
import { LogsService } from './ui/services/logs.service';

/**
 * Logs feature module.
 *
 * A leaf output feature: it records and streams a deployment's log output. It
 * owns the persisted `logs` table (whose `deploymentId` is a data-level FK only)
 * plus the live log stream (Redis buffer + SSE), and exposes a write port
 * ({@link PersistentLogStoreRepository}) that the deployments feature uses to
 * stream and complete a run's output. It depends on no other feature module.
 */
@Module({
    imports: [TypeOrmModule.forFeature([DbLogEntity])],
    controllers: [LogsController],
    providers: [
        LogsService,
        DatabaseLogsRepository,
        RedisLogStoreAdapter,
        PersistentLogStoreRepository,
    ],
    exports: [PersistentLogStoreRepository],
})
export class LogsModule {}
