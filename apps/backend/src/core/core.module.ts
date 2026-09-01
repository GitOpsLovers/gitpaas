import { Global, Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { validate } from './infrastructure/config/env-validation.config';
import { OtplibTotpAdapter } from './infrastructure/crypto/otplib-totp.adapter';
import { SecretCipherAdapter } from './infrastructure/crypto/secret-cipher.adapter';
import { buildDataSourceOptions } from './infrastructure/database/data-source-options';
import { createInstrumentedDataSource } from './infrastructure/database/instrumented-data-source';
import { DockerContainerRuntimeAdapter } from './infrastructure/docker/docker-container-runtime.adapter';
import { NestLoggerAdapter } from './infrastructure/logging/nest-logger.adapter';
import { QrCodeRendererAdapter } from './infrastructure/qrcode/qrcode-renderer.adapter';
import { RedisConnection } from './infrastructure/redis/redis.connection';
import { StdoutTelemetryWriterAdapter } from './infrastructure/telemetry/stdout-telemetry-writer.adapter';
import { RequestIdMiddleware } from './ui/middlewares/request-id.middleware';
import { TelemetryMiddleware } from './ui/middlewares/telemetry.middleware';

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
            dataSourceFactory: createInstrumentedDataSource,
        }),
    ],
    providers: [
        DockerContainerRuntimeAdapter,
        NestLoggerAdapter,
        OtplibTotpAdapter,
        QrCodeRendererAdapter,
        RedisConnection,
        RequestIdMiddleware,
        SecretCipherAdapter,
        StdoutTelemetryWriterAdapter,
        TelemetryMiddleware,
    ],
    exports: [
        DockerContainerRuntimeAdapter,
        NestLoggerAdapter,
        OtplibTotpAdapter,
        QrCodeRendererAdapter,
        RedisConnection,
        SecretCipherAdapter,
        StdoutTelemetryWriterAdapter,
    ],
})

export class CoreModule implements NestModule {
    public configure(consumer: MiddlewareConsumer): void {
        consumer.apply(RequestIdMiddleware, TelemetryMiddleware).forRoutes('{*path}');
    }
}
