import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ServiceDbEntity } from './infrastructure/database/service-db.entity';
import { ServicesDatabaseRepository } from './infrastructure/database/services-db.repository';
import { DockerServiceRuntimeResourcesAdapter } from './infrastructure/docker/docker-service-runtime-resources.adapter';
import { ServicesController } from './ui/controllers/services.controller';
import { ServicesService } from './ui/services/services.service';

import { DeploymentsModule } from '@features/deployments/deployments.module';
import { LogsModule } from '@features/logs/logs.module';

/**
 * Services feature module.
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([ServiceDbEntity]),
        LogsModule,
        forwardRef(() => DeploymentsModule),
    ],
    controllers: [ServicesController],
    providers: [
        ServicesService,
        ServicesDatabaseRepository,
        DockerServiceRuntimeResourcesAdapter,
    ],
    exports: [ServicesDatabaseRepository],
})
export class ServicesModule {}
