import type { UpdateServiceDto } from '@gitpaas/contracts';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateServiceWithComposeProjectDto } from '../../domain/dtos/create-service-with-compose-project.dto';
import { Service } from '../../domain/models/service.models';
import { ServicesRepository } from '../../domain/repositories/services.repository';

import { DbServiceEntity } from './db-service.entity';
import { toService, toServicePersistenceError } from './db-services.transformer';

/**
 * Services database repository
 */
@Injectable()
export class DatabaseServicesRepository implements ServicesRepository {
    constructor(
        @InjectRepository(DbServiceEntity)
        private readonly repository: Repository<DbServiceEntity>,
    ) {}

    public async getAll(): Promise<Service[]> {
        const services = await this.repository.find();

        return services.map(toService);
    }

    public async getAllByProject(projectId: string): Promise<Service[]> {
        const services = await this.repository.find({ where: { projectId }, order: { id: 'DESC' } });

        return services.map(toService);
    }

    public async findById(id: string): Promise<Service | null> {
        const service = await this.repository.findOneBy({ id });

        if (!service) {
            return null;
        }

        return toService(service);
    }

    public async create(createDto: CreateServiceWithComposeProjectDto): Promise<Service> {
        try {
            const service = this.repository.create(createDto);
            const saved = await this.repository.save(service);

            return toService(saved);
        } catch (error) {
            throw toServicePersistenceError(error, createDto.projectId, createDto.name, createDto.providerId);
        }
    }

    public async update(id: string, updateDto: UpdateServiceDto): Promise<Service | null> {
        const service = await this.repository.findOneBy({ id });

        if (!service) {
            return null;
        }

        this.repository.merge(service, updateDto);

        try {
            const saved = await this.repository.save(service);

            return toService(saved);
        } catch (error) {
            throw toServicePersistenceError(error, service.projectId, updateDto.name, updateDto.providerId);
        }
    }

    public async delete(id: string): Promise<boolean> {
        const result = await this.repository.delete(id);

        return (result.affected ?? 0) > 0;
    }
}
