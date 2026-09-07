import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TarRepositoryComposeFileAdapter } from './infrastructure/archive/tar-repository-compose-file.adapter';
import { DbServiceEntity } from './infrastructure/database/db-service.entity';
import { DatabaseServicesRepository } from './infrastructure/database/db-services.repository';
import { DockerServiceRuntimeResourcesAdapter } from './infrastructure/docker/docker-service-runtime-resources.adapter';
import { ServicesController } from './ui/controllers/services.controller';
import { ServicesService } from './ui/services/services.service';

import { DeploymentsModule } from '@features/deployments/deployments.module';
import { LogsModule } from '@features/logs/logs.module';
import { NamespacesModule } from '@features/namespaces/namespaces.module';
import { ProjectsModule } from '@features/projects/projects.module';
import { ProvidersModule } from '@features/providers/providers.module';

/**
 * Services feature module.
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([DbServiceEntity]),
        LogsModule,
        NamespacesModule,
        ProjectsModule,
        ProvidersModule,
        forwardRef(() => DeploymentsModule),
    ],
    controllers: [ServicesController],
    providers: [
        ServicesService,
        DatabaseServicesRepository,
        DockerServiceRuntimeResourcesAdapter,
        TarRepositoryComposeFileAdapter,
    ],
    exports: [DatabaseServicesRepository],
})
export class ServicesModule {}
