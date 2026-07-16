import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateServiceDto } from '../../domain/dtos/create-service.dto';
import { UpdateServiceDto } from '../../domain/dtos/update-service.dto';
import { Service } from '../../domain/models/service.model';
import { ServicesRepository } from '../../domain/repositories/services.repository';

import { ServiceDbEntity } from './service-db.entity';
import { toService } from './services-db.transformer';

/**
 * Services database repository
 */
@Injectable()
export class ServicesDatabaseRepository implements ServicesRepository {
    constructor(
        @InjectRepository(ServiceDbEntity)
        private readonly repository: Repository<ServiceDbEntity>,
    ) {}

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

    public async create(createDto: CreateServiceDto): Promise<Service> {
        const service = this.repository.create(createDto);
        const saved = await this.repository.save(service);

        return toService(saved);
    }

    public async update(id: string, updateDto: UpdateServiceDto): Promise<Service | null> {
        const service = await this.repository.findOneBy({ id });

        if (!service) {
            return null;
        }

        this.repository.merge(service, updateDto);
        const saved = await this.repository.save(service);

        return toService(saved);
    }

    public async delete(id: string): Promise<boolean> {
        const result = await this.repository.delete(id);

        return (result.affected ?? 0) > 0;
    }
}
