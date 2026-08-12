import { Global, Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { validate } from './infrastructure/config/env-validation.config';
import { buildDataSourceOptions } from './infrastructure/database/data-source-options';
import { DockerContainerRuntimeAdapter } from './infrastructure/docker/docker-container-runtime.adapter';
import { NestLoggerAdapter } from './infrastructure/logging/nest-logger.adapter';
import { StdoutWideEventSinkAdapter } from './infrastructure/observability/stdout-wide-event-sink.adapter';
import { RedisConnection } from './infrastructure/redis/redis.connection';
import { RequestIdMiddleware } from './ui/middlewares/request-id.middleware';
import { WideEventMiddleware } from './ui/middlewares/wide-event.middleware';

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
    providers: [
        DockerContainerRuntimeAdapter,
        NestLoggerAdapter,
        RedisConnection,
        RequestIdMiddleware,
        StdoutWideEventSinkAdapter,
        WideEventMiddleware,
    ],
    exports: [DockerContainerRuntimeAdapter, NestLoggerAdapter, RedisConnection, StdoutWideEventSinkAdapter],
})

export class CoreModule implements NestModule {
    public configure(consumer: MiddlewareConsumer): void {
        consumer.apply(RequestIdMiddleware, WideEventMiddleware).forRoutes('*');
    }
}
