import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateServiceDto } from '../../domain/dtos/create-service.dto';
import { UpdateServiceDto } from '../../domain/dtos/update-service.dto';
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

    /**
     * Get every service across all projects
     *
     * @returns List of every service
     */
    public async getAll(): Promise<Service[]> {
        const services = await this.repository.find();

        return services.map(toService);
    }

    /**
     * Get every service belonging to a project
     *
     * @param projectId Project identifier
     *
     * @returns List of services for the project
     */
    public async getAllByProject(projectId: string): Promise<Service[]> {
        const services = await this.repository.find({ where: { projectId }, order: { id: 'DESC' } });

        return services.map(toService);
    }

    /**
     * Find a single service by its identifier
     *
     * @param id Service identifier
     *
     * @returns Service, or `null` when it does not exist
     */
    public async findById(id: string): Promise<Service | null> {
        const service = await this.repository.findOneBy({ id });

        if (!service) {
            return null;
        }

        return toService(service);
    }

    /**
     * Create a new service
     *
     * A write that violates the project foreign key is translated into the
     * domain error describing it, so the caller answers 404 for a project that
     * does not exist instead of leaking a driver failure as a 500.
     *
     * @param createDto Data for creating the service
     *
     * @returns Created service
     *
     * @throws {ProjectNotFoundError} When the project the service is attached to does not exist
     */
    public async create(createDto: CreateServiceDto): Promise<Service> {
        try {
            const service = this.repository.create(createDto);
            const saved = await this.repository.save(service);

            return toService(saved);
        } catch (error) {
            throw toServicePersistenceError(error, createDto.projectId);
        }
    }

    /**
     * Update an existing service
     *
     * @param id Service identifier
     * @param updateDto Data for updating the service
     *
     * @returns Updated service, or `null` when it does not exist
     */
    public async update(id: string, updateDto: UpdateServiceDto): Promise<Service | null> {
        const service = await this.repository.findOneBy({ id });

        if (!service) {
            return null;
        }

        this.repository.merge(service, updateDto);
        const saved = await this.repository.save(service);

        return toService(saved);
    }

    /**
     * Delete a service
     *
     * @param id Service identifier
     *
     * @returns `true` when a row was deleted, `false` otherwise
     */
    public async delete(id: string): Promise<boolean> {
        const result = await this.repository.delete(id);

        return (result.affected ?? 0) > 0;
    }
}
