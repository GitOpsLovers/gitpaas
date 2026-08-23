import type { SetServiceVariableDto, UpdateServiceVariableDto } from '@gitpaas/contracts';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ServiceVariable } from '../../domain/models/service-variable.models';
import { ServiceVariablesRepository } from '../../domain/repositories/service-variables.repository';

import { DbServiceVariableEntity } from './db-service-variable.entity';
import { toServiceVariable } from './db-service-variables.transformer';

/**
 * Service variables database repository
 */
@Injectable()
export class DatabaseServiceVariablesRepository implements ServiceVariablesRepository {
    constructor(
        @InjectRepository(DbServiceVariableEntity)
        private readonly repository: Repository<DbServiceVariableEntity>,
    ) {}

    public async getByService(serviceId: string): Promise<ServiceVariable[]> {
        const variables = await this.repository.find({
            where: { serviceId },
            order: { name: 'ASC' },
        });

        return variables.map(toServiceVariable);
    }

    public async findById(id: string): Promise<ServiceVariable | null> {
        const variable = await this.repository.findOneBy({ id });

        if (!variable) {
            return null;
        }

        return toServiceVariable(variable);
    }

    public async findByName(serviceId: string, name: string): Promise<ServiceVariable | null> {
        const variable = await this.repository.findOneBy({ serviceId, name });

        if (!variable) {
            return null;
        }

        return toServiceVariable(variable);
    }

    public async create(
        serviceId: string,
        setDto: SetServiceVariableDto,
        storedValue: string,
    ): Promise<ServiceVariable> {
        const variable = this.repository.create({
            serviceId,
            name: setDto.name,
            secret: setDto.secret ?? false,
            value: storedValue,
        });

        const saved = await this.repository.save(variable);

        return toServiceVariable(saved);
    }

    public async update(
        id: string,
        updateDto: UpdateServiceVariableDto,
        storedValue?: string,
    ): Promise<ServiceVariable | null> {
        const variable = await this.repository.findOneBy({ id });

        if (!variable) {
            return null;
        }

        this.repository.merge(variable, {
            ...(updateDto.name === undefined ? {} : { name: updateDto.name }),
            ...(storedValue === undefined ? {} : { value: storedValue }),
        });

        const saved = await this.repository.save(variable);

        return toServiceVariable(saved);
    }

    public async delete(id: string): Promise<boolean> {
        const result = await this.repository.delete(id);

        return (result.affected ?? 0) > 0;
    }
}
