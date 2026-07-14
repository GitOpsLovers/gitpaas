import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { validate } from './infrastructure/config/env.validation';
import { DockerClient } from './infrastructure/docker/docker.client';
import { DockerodeDockerExecutor } from './infrastructure/docker/dockerode-docker.executor';
import { RedisClient } from './infrastructure/redis/redis.client';
import { DockerController } from './ui/controllers/docker.controller';
import { DockerService } from './ui/services/docker.service';

/**
 * Core module. Global so shared infrastructure it exports (e.g. {@link RedisClient},
 * {@link DockerClient}, {@link DockerodeDockerExecutor}) can be injected by any
 * feature module without importing this module explicitly.
 */
@Global()
@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, validate }),
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                type: 'postgres',
                host: config.get<string>('DB_HOST', '127.0.0.1'),
                port: Number(config.get('DB_PORT', 5432)),
                username: config.get<string>('DB_USER', 'artifactory'),
                password: config.get<string>('DB_PASSWORD', 'artifactory'),
                database: config.get<string>('DB_NAME', 'artifactory'),
                autoLoadEntities: true,
                // Auto-creates/updates tables in development. Use migrations in production.
                synchronize: config.get<string>('NODE_ENV') !== 'production',
            }),
        }),
    ],
    controllers: [DockerController],
    providers: [DockerClient, DockerodeDockerExecutor, DockerService, RedisClient],
    exports: [DockerClient, DockerodeDockerExecutor, RedisClient],
})

export class CoreModule {}
