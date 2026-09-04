import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ServiceVolumeMount, VolumeMount } from '../../domain/models/volume.models';
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

    public async attach(serviceId: string, volumeId: string, mount: VolumeMount): Promise<void> {
        const existing = await this.repository.findOneBy({ serviceId, volumeId });

        if (existing) {
            this.repository.merge(existing, {
                composeServiceName: mount.composeServiceName,
                containerPath: mount.containerPath,
                readOnly: mount.readOnly,
            });

            await this.repository.save(existing);

            return;
        }

        await this.repository.save(this.repository.create({
            serviceId,
            volumeId,
            composeServiceName: mount.composeServiceName,
            containerPath: mount.containerPath,
            readOnly: mount.readOnly,
        }));
    }

    public async detach(serviceId: string, volumeId: string): Promise<boolean> {
        const result = await this.repository.delete({ serviceId, volumeId });

        return (result.affected ?? 0) > 0;
    }
}
