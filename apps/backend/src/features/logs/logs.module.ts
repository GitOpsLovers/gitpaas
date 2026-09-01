import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DbLogEntity } from './infrastructure/database/db-log.entity';
import { DatabaseLogsRepository } from './infrastructure/database/db-logs.repository';
import { DbRuntimeLogEntity } from './infrastructure/database/db-runtime-log.entity';
import { DatabaseRuntimeLogsRepository } from './infrastructure/database/db-runtime-logs.repository';
import { DockerRuntimeLogFollowerAdapter } from './infrastructure/docker/docker-runtime-log-follower.adapter';
import { MemoryRuntimeLogStoreAdapter } from './infrastructure/memory/memory-runtime-log-store.adapter';
import { RedisLogStoreAdapter } from './infrastructure/redis/redis-log-store.adapter';
import { LogsController } from './ui/controllers/logs.controller';
import { FollowRunningContainersJob } from './ui/jobs/follow-running-containers.job';
import { RemoveExpiredLogsJob } from './ui/jobs/remove-expired-logs.job';
import { LogsService } from './ui/services/logs.service';

import { DbDeploymentEntity } from '@features/deployments/infrastructure/database/db-deployment.entity';
import { DatabaseDeploymentsRepository } from '@features/deployments/infrastructure/database/db-deployments.repository';
import { DbPlatformSettingsEntity } from '@features/server/infrastructure/database/db-platform-settings.entity';
import { DatabasePlatformSettingsRepository } from '@features/server/infrastructure/database/db-platform-settings.repository';

/**
 * Logs feature module.
 */
@Module({
    imports: [TypeOrmModule.forFeature([DbLogEntity, DbRuntimeLogEntity, DbPlatformSettingsEntity, DbDeploymentEntity])],
    controllers: [LogsController],
    providers: [
        LogsService,
        DatabaseLogsRepository,
        DatabaseDeploymentsRepository,
        DatabasePlatformSettingsRepository,
        DatabaseRuntimeLogsRepository,
        RedisLogStoreAdapter,
        MemoryRuntimeLogStoreAdapter,
        DockerRuntimeLogFollowerAdapter,
        FollowRunningContainersJob,
        RemoveExpiredLogsJob,
    ],
    exports: [RedisLogStoreAdapter, MemoryRuntimeLogStoreAdapter],
})
export class LogsModule {}
