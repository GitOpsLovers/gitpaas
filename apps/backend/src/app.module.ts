import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { CoreModule } from '@core/core.module';
import { AllExceptionsFilter } from '@core/ui/filters/all-exceptions.filter';
import { ContainersModule } from '@features/containers/containers.module';
import { DeploymentsModule } from '@features/deployments/deployments.module';
import { NetworksModule } from '@features/networks/networks.module';
import { ProjectsModule } from '@features/projects/projects.module';
import { ProvidersModule } from '@features/providers/providers.module';
import { ServerModule } from '@features/server/server.module';
import { ServicesModule } from '@features/services/services.module';

/**
 * Main application module
 */
@Module({
    imports: [
        CoreModule,
        ProjectsModule,
        ProvidersModule,
        ServicesModule,
        DeploymentsModule,
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
    ],
})
export class AppModule {}
