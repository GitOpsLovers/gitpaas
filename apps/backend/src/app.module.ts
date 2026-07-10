import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { CoreModule } from '@core/core.module';
import { DockerModule } from '@core/docker/docker.module';
import { ProjectsModule } from '@features/projects/projects.module';

@Module({
    imports: [CoreModule, DockerModule, ProjectsModule],
    controllers: [AppController],
    providers: [AppService],
})

/**
 * Main application module
 */
export class AppModule {}
