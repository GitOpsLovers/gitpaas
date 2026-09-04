import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Volume } from '../../domain/models/volume.models';
import { VolumesRepository } from '../../domain/repositories/volumes.repository';

import { DbVolumeEntity } from './db-volume.entity';
import { toVolume } from './db-volumes.transformer';

/**
 * Volumes database repository
 */
@Injectable()
export class DatabaseVolumesRepository implements VolumesRepository {
    constructor(
        @InjectRepository(DbVolumeEntity)
        private readonly repository: Repository<DbVolumeEntity>,
    ) {}

    public async listByService(serviceId: string): Promise<Volume[]> {
        const volumes = await this.repository.find({
            where: { serviceId },
            order: { name: 'ASC' },
        });

        return volumes.map(toVolume);
    }

    public async findById(id: string): Promise<Volume | null> {
        const volume = await this.repository.findOneBy({ id });

        if (!volume) {
            return null;
        }

        return toVolume(volume);
    }

    public async create(volume: Volume): Promise<Volume> {
        const created = this.repository.create({
            id: volume.id,
            serviceId: volume.serviceId,
            name: volume.name,
            daemonKey: volume.daemonKey,
            origin: volume.origin,
        });

        const saved = await this.repository.save(created);

        return toVolume(saved);
    }

    public async rename(id: string, name: string): Promise<Volume | null> {
        const volume = await this.repository.findOneBy({ id });

        if (!volume) {
            return null;
        }

        this.repository.merge(volume, { name });

        const saved = await this.repository.save(volume);

        return toVolume(saved);
    }
}
