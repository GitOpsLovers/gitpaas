import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { validate } from './infrastructure/config/env-validation.config';
import { buildDataSourceOptions } from './infrastructure/database/data-source-options';
import { DockerContainerRuntimeAdapter } from './infrastructure/docker/docker-container-runtime.adapter';
import { RedisClient } from './infrastructure/redis/redis.client';
import { Argon2PasswordHasherAdapter } from './infrastructure/security/argon2-password-hasher.adapter';
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
            // Connection options come from the shared factory so the Nest
            // runtime and the standalone CLI DataSource stay in lockstep. The
            // factory reads from the same validated environment ConfigService
            // exposes. The runtime additionally uses autoLoadEntities so Nest's
            // feature modules register their own entities; the standalone
            // DataSource must not rely on that and discovers entities by glob.
            useFactory: (_config: ConfigService) => ({
                ...buildDataSourceOptions(),
                autoLoadEntities: true,
            }),
        }),
    ],
    controllers: [ContainerRuntimeController],
    providers: [DockerContainerRuntimeAdapter, ContainerRuntimeService, RedisClient, DiagnosticLoggerService, Argon2PasswordHasherAdapter],
    exports: [DockerContainerRuntimeAdapter, RedisClient, DiagnosticLoggerService, Argon2PasswordHasherAdapter],
})

export class CoreModule {}
