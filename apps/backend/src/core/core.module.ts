import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { validate } from './infrastructure/config/env.validation';
import { DockerClient } from './infrastructure/docker/docker.client';
import { RedisClient } from './infrastructure/redis/redis.client';
import { DockerController } from './ui/controllers/docker.controller';
import { DockerService } from './ui/services/docker.service';
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
            useFactory: (config: ConfigService) => ({
                type: 'postgres',
                host: config.get<string>('DB_HOST'),
                port: Number(config.get('DB_PORT')),
                username: config.get<string>('DB_USER'),
                password: config.get<string>('DB_PASSWORD'),
                database: config.get<string>('DB_NAME'),
                autoLoadEntities: true,
                // Auto-creates/updates tables in development. Use migrations in production.
                synchronize: config.get<string>('NODE_ENV') !== 'production',
            }),
        }),
    ],
    controllers: [DockerController],
    providers: [DockerClient, DockerService, RedisClient, DiagnosticLoggerService],
    exports: [DockerClient, RedisClient, DiagnosticLoggerService],
})

export class CoreModule {}
