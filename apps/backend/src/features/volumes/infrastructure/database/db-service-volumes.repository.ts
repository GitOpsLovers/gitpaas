import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ServiceVolumeMount } from '../../domain/models/volume.models';
import { ServiceVolumesRepository } from '../../domain/repositories/service-volumes.repository';

import { DbServiceVolumeEntity } from './db-service-volume.entity';
import { toServiceVolumeMount } from './db-service-volumes.transformer';

/**
 * Service volumes database repository
 */
@Injectable()
export class DatabaseServiceVolumesRepository implements ServiceVolumesRepository {
    constructor(
        @InjectRepository(DbServiceVolumeEntity)
        private readonly repository: Repository<DbServiceVolumeEntity>,
    ) {}

    public async listByService(serviceId: string): Promise<ServiceVolumeMount[]> {
        const mounts = await this.repository.find({
            where: { serviceId },
            order: { containerPath: 'ASC' },
        });

        return mounts.map(toServiceVolumeMount);
    }

    public async save(serviceId: string, mount: ServiceVolumeMount): Promise<void> {
        await this.repository.upsert(
            {
                serviceId,
                volumeId: mount.volumeId,
                composeServiceName: mount.composeServiceName,
                containerPath: mount.containerPath,
                readOnly: mount.readOnly,
            },
            ['serviceId', 'volumeId'],
        );
    }

    public async delete(serviceId: string, volumeId: string): Promise<void> {
        await this.repository.delete({ serviceId, volumeId });
    }
}
