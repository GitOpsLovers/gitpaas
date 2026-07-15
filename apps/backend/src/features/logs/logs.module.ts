import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LogDbEntity } from './infrastructure/database/log-db.entity';
import { LogsDatabaseRepository } from './infrastructure/database/logs-db.repository';
import { PersistentLogStoreRepository } from './infrastructure/log-store/persistent-log-store.repository';
import { RedisLogStoreRepository } from './infrastructure/redis/redis-log-store.repository';
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
    imports: [TypeOrmModule.forFeature([LogDbEntity])],
    controllers: [LogsController],
    providers: [
        LogsService,
        LogsDatabaseRepository,
        RedisLogStoreRepository,
        PersistentLogStoreRepository,
    ],
    exports: [PersistentLogStoreRepository],
})
export class LogsModule {}
