import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { validate } from './infrastructure/config/env-validation.config';
import { buildDataSourceOptions } from './infrastructure/database/data-source-options';
import { DockerContainerRuntimeAdapter } from './infrastructure/docker/docker-container-runtime.adapter';
import { RedisClient } from './infrastructure/redis/redis.client';
import { ContainerRuntimeController } from './ui/controllers/container-runtime.controller';
import { ContainerRuntimeService } from './ui/services/container-runtime.service';
import { DiagnosticLoggerService } from './ui/services/diagnostic-logger.service';

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
    controllers: [ContainerRuntimeController],
    providers: [DockerContainerRuntimeAdapter, ContainerRuntimeService, RedisClient, DiagnosticLoggerService],
    exports: [DockerContainerRuntimeAdapter, RedisClient, DiagnosticLoggerService],
})

export class CoreModule {}
