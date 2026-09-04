import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DbServiceVolumeEntity } from './infrastructure/database/db-service-volume.entity';
import { DatabaseServiceVolumesRepository } from './infrastructure/database/db-service-volumes.repository';
import { DbVolumeEntity } from './infrastructure/database/db-volume.entity';
import { DatabaseVolumesRepository } from './infrastructure/database/db-volumes.repository';
import { DockerVolumesRepository } from './infrastructure/docker/docker-volumes.repository';
import { VolumesController } from './ui/controllers/volumes.controller';
import { VolumesService } from './ui/services/volumes.service';

import { ServicesModule } from '@features/services/services.module';

/**
 * Volumes feature module.
 */
@Module({
    imports: [
        ServicesModule,
        TypeOrmModule.forFeature([DbVolumeEntity, DbServiceVolumeEntity]),
    ],
    controllers: [VolumesController],
    providers: [VolumesService, DatabaseVolumesRepository, DatabaseServiceVolumesRepository, DockerVolumesRepository],
    exports: [DatabaseVolumesRepository, DatabaseServiceVolumesRepository, DockerVolumesRepository],
})
export class VolumesModule {}
