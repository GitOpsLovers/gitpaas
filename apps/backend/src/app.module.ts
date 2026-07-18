import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { CoreModule } from '@core/core.module';
import { AllExceptionsFilter } from '@core/ui/filters/all-exceptions.filter';
import { AuthenticationModule } from '@features/authentication/authentication.module';
import { ContainersModule } from '@features/containers/containers.module';
import { DeploymentsModule } from '@features/deployments/deployments.module';
import { LogsModule } from '@features/logs/logs.module';
import { NetworksModule } from '@features/networks/networks.module';
import { ProjectsModule } from '@features/projects/projects.module';
import { ProvidersModule } from '@features/providers/providers.module';
import { ServerModule } from '@features/server/server.module';
import { ServicesModule } from '@features/services/services.module';
import { UsersModule } from '@features/users/users.module';

/**
 * Main application module
 */
@Module({
    imports: [
        CoreModule,
        ThrottlerModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                throttlers: [
                    {
                        name: 'default',
                        ttl: config.getOrThrow<number>('THROTTLE_TTL'),
                        limit: config.getOrThrow<number>('THROTTLE_LIMIT'),
                    },
                    {
                        name: 'stream',
                        ttl: config.getOrThrow<number>('THROTTLE_STREAM_TTL'),
                        limit: config.getOrThrow<number>('THROTTLE_STREAM_LIMIT'),
                    },
                ],
            }),
        }),
        UsersModule,
        AuthenticationModule,
        ProjectsModule,
        ProvidersModule,
        ServicesModule,
        DeploymentsModule,
        LogsModule,
        ContainersModule,
        NetworksModule,
        ServerModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: APP_FILTER,
            useClass: AllExceptionsFilter,
        },
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule {}
