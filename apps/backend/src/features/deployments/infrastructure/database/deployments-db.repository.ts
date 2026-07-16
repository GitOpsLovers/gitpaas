import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateDeploymentDto } from '../../domain/dtos/create-deployment.dto';
import { UpdateDeploymentDto } from '../../domain/dtos/update-deployment.dto';
import { Deployment, DeploymentStatus } from '../../domain/models/deployment.model';
import { DeploymentsRepository } from '../../domain/repositories/deployments.repository';

import { DeploymentDbEntity } from './deployment-db.entity';
import { toDeployment } from './deployments-db.transformer';

/**
 * Statuses that end a deployment's lifecycle.
 */
const TERMINAL_STATUSES: ReadonlySet<DeploymentStatus> = new Set(['success', 'failed']);

/**
 * Deployments database repository
 */
@Injectable()
export class DeploymentsDatabaseRepository implements DeploymentsRepository {
    constructor(
        @InjectRepository(DeploymentDbEntity)
        private readonly repository: Repository<DeploymentDbEntity>,
    ) {}

    public async getAllByService(serviceId: string): Promise<Deployment[]> {
        const deployments = await this.repository.find({
            where: { serviceId },
            order: { createdAt: 'DESC' },
        });

        return deployments.map(toDeployment);
    }

    public async findById(id: string): Promise<Deployment | null> {
        const deployment = await this.repository.findOneBy({ id });

        if (!deployment) {
            return null;
        }

        return toDeployment(deployment);
    }

    public async create(createDto: CreateDeploymentDto): Promise<Deployment> {
        const entity = this.repository.create({ ...createDto, status: 'pending' });
        const saved = await this.repository.save(entity);

        return toDeployment(saved);
    }

    public async update(id: string, updateDto: UpdateDeploymentDto): Promise<Deployment | null> {
        const deployment = await this.repository.findOneBy({ id });

        if (!deployment) {
            return null;
        }

        deployment.status = updateDto.status;
        deployment.error = updateDto.error ?? null;
        deployment.finishedAt = TERMINAL_STATUSES.has(updateDto.status) ? new Date() : null;

        const saved = await this.repository.save(deployment);

        return toDeployment(saved);
    }

    public async delete(id: string): Promise<boolean> {
        const result = await this.repository.delete(id);

        return (result.affected ?? 0) > 0;
    }
}
