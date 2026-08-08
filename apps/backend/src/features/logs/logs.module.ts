import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseLogStoreAdapter } from './infrastructure/database/db-log-store.adapter';
import { DbLogEntity } from './infrastructure/database/db-log.entity';
import { DatabaseLogsRepository } from './infrastructure/database/db-logs.repository';
import { LogsController } from './ui/controllers/logs.controller';
import { LogsService } from './ui/services/logs.service';

/**
 * Logs feature module.
 *
 * A leaf output feature: it records and streams a deployment's log output. It
 * owns the persisted `logs` table (whose `deploymentId` is a data-level FK only),
 * which doubles as the live stream's durable buffer, and exposes a write port
 * ({@link DatabaseLogStoreAdapter}) that the deployments feature uses to stream
 * and complete a run's output. It depends on no other feature module.
 */
@Module({
    imports: [TypeOrmModule.forFeature([DbLogEntity])],
    controllers: [LogsController],
    providers: [
        LogsService,
        DatabaseLogsRepository,
        DatabaseLogStoreAdapter,
    ],
    exports: [DatabaseLogStoreAdapter],
})
export class LogsModule {}
