import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { validate } from './infrastructure/config/env-validation.config';
import { buildDataSourceOptions } from './infrastructure/database/data-source-options';
import { DockerContainerRuntimeAdapter } from './infrastructure/docker/docker-container-runtime.adapter';
import { NestLoggerAdapter } from './infrastructure/logging/nest-logger.adapter';
import { RedisConnection } from './infrastructure/redis/redis.connection';

/**
 * Core module
 */
@Global()
@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, validate }),
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (_config: ConfigService) => ({
                ...buildDataSourceOptions(),
                autoLoadEntities: true,
            }),
        }),
    ],
    providers: [DockerContainerRuntimeAdapter, NestLoggerAdapter, RedisConnection],
    exports: [DockerContainerRuntimeAdapter, NestLoggerAdapter, RedisConnection],
})

export class CoreModule {}
