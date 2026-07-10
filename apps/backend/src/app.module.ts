import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { DockerModule } from '@core/docker/docker.module';

@Module({
    imports: [DockerModule],
    controllers: [AppController],
    providers: [AppService],
})

/**
 * Main application module
 */
export class AppModule {}
