import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { CoreModule } from '@core/core.module';
import { DockerModule } from '@core/docker/docker.module';
import { DeploymentsModule } from '@features/deployments/deployments.module';
import { ProjectsModule } from '@features/projects/projects.module';
import { ProvidersModule } from '@features/providers/providers.module';
import { ServicesModule } from '@features/services/services.module';

@Module({
    imports: [CoreModule, DockerModule, ProjectsModule, ProvidersModule, ServicesModule, DeploymentsModule],
    controllers: [AppController],
    providers: [AppService],
})

/**
 * Main application module
 */
export class AppModule {}
