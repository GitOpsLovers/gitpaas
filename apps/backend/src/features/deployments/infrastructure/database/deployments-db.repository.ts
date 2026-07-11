import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateDeploymentDto } from '../../domain/dtos/create-deployment.dto';
import { UpdateDeploymentDto } from '../../domain/dtos/update-deployment.dto';
import { Deployment, DeploymentStatus } from '../../domain/models/deployment.model';
import { DeploymentsRepository } from '../../domain/repositories/deployments.repository';

import { DeploymentDbEntity } from './deployment-db.entity';

/**
 * Statuses that end a deployment's lifecycle.
 */
const TERMINAL_STATUSES: ReadonlySet<DeploymentStatus> = new Set(['success', 'failed']);

@Injectable()

/**
 * Deployments database repository
 */
export class DeploymentsDatabaseRepository implements DeploymentsRepository {
    constructor(
        @InjectRepository(DeploymentDbEntity)
        private readonly repository: Repository<DeploymentDbEntity>,
    ) {}

    public getAllByService(serviceId: string): Promise<Deployment[]> {
        return this.repository.find({ where: { serviceId }, order: { createdAt: 'DESC' } });
    }

    public findById(id: string): Promise<Deployment | null> {
        return this.repository.findOneBy({ id });
    }

    public create(createDto: CreateDeploymentDto): Promise<Deployment> {
        const entity = this.repository.create({ ...createDto, status: 'pending' });

        return this.repository.save(entity);
    }

    public async update(id: string, updateDto: UpdateDeploymentDto): Promise<Deployment | null> {
        const deployment = await this.repository.findOneBy({ id });

        if (!deployment) {
            return null;
        }

        deployment.status = updateDto.status;
        deployment.error = updateDto.error ?? null;
        deployment.finishedAt = TERMINAL_STATUSES.has(updateDto.status) ? new Date() : null;

        return this.repository.save(deployment);
    }
}
