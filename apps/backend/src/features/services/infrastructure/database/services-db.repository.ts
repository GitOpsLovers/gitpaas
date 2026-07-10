import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateServiceDto } from '../../domain/dtos/create-service.dto';
import { UpdateServiceDto } from '../../domain/dtos/update-service.dto';
import { Service } from '../../domain/models/service.model';
import { ServicesRepository } from '../../domain/repositories/services.repository';

import { ServiceDbEntity } from './service-db.entity';

@Injectable()

/**
 * Services database repository
 */
export class ServicesDatabaseRepository implements ServicesRepository {
    constructor(
        @InjectRepository(ServiceDbEntity)
        private readonly repository: Repository<ServiceDbEntity>,
    ) {}

    public getAllByProject(projectId: string): Promise<Service[]> {
        return this.repository.find({ where: { projectId }, order: { id: 'DESC' } });
    }

    public findById(id: string): Promise<Service | null> {
        return this.repository.findOneBy({ id });
    }

    public create(createDto: CreateServiceDto): Promise<Service> {
        const service = this.repository.create(createDto);

        return this.repository.save(service);
    }

    public async update(id: string, updateDto: UpdateServiceDto): Promise<Service | null> {
        const service = await this.repository.findOneBy({ id });

        if (!service) {
            return null;
        }

        this.repository.merge(service, updateDto);

        return this.repository.save(service);
    }

    public async delete(id: string): Promise<boolean> {
        const result = await this.repository.delete(id);

        return (result.affected ?? 0) > 0;
    }
}
