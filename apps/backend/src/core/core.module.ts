import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { validate } from './infrastructure/config/env-validation.config';
import { buildDataSourceOptions } from './infrastructure/database/data-source-options';
import { DockerClient } from './infrastructure/docker/docker.client';
import { RedisClient } from './infrastructure/redis/redis.client';
import { PasswordHasherArgon2Adapter } from './infrastructure/security/password-hasher-argon2.adapter';
import { DockerController } from './ui/controllers/docker.controller';
import { DiagnosticLoggerService } from './ui/services/diagnostic-logger.service';
import { DockerService } from './ui/services/docker.service';

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
    controllers: [DockerController],
    providers: [DockerClient, DockerService, RedisClient, DiagnosticLoggerService, PasswordHasherArgon2Adapter],
    exports: [DockerClient, RedisClient, DiagnosticLoggerService, PasswordHasherArgon2Adapter],
})

export class CoreModule {}
