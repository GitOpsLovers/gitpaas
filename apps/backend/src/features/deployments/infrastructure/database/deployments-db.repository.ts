import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateDeploymentDto } from '../../domain/dtos/create-deployment.dto';
import { UpdateDeploymentDto } from '../../domain/dtos/update-deployment.dto';
import { Deployment, DeploymentStatus } from '../../domain/models/deployment.models';
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

    /**
     * Get every deployment belonging to a service, most recent first
     *
     * @param serviceId Service identifier
     *
     * @returns List of deployments for the service
     */
    public async getAllByService(serviceId: string): Promise<Deployment[]> {
        const deployments = await this.repository.find({
            where: { serviceId },
            order: { createdAt: 'DESC' },
        });

        return deployments.map(toDeployment);
    }

    /**
     * Find a single deployment by its identifier
     *
     * @param id Deployment identifier
     *
     * @returns Deployment record, or `null` if not found
     */
    public async findById(id: string): Promise<Deployment | null> {
        const deployment = await this.repository.findOneBy({ id });

        if (!deployment) {
            return null;
        }

        return toDeployment(deployment);
    }

    /**
     * Create a new deployment record in the `pending` state
     *
     * @param createDto Data for creating the deployment
     *
     * @returns Created deployment
     */
    public async create(createDto: CreateDeploymentDto): Promise<Deployment> {
        const entity = this.repository.create({ ...createDto, status: 'pending' });
        const saved = await this.repository.save(entity);

        return toDeployment(saved);
    }

    /**
     * Update a deployment's status, stamping `finishedAt` on terminal states
     *
     * @param id Deployment identifier
     * @param updateDto New status (and failure message, when the status is `failed`)
     *
     * @returns Updated deployment, or `null` when it does not exist
     */
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

    /**
     * Delete a deployment record
     *
     * @param id Deployment identifier
     *
     * @returns `true` when a row was deleted, `false` otherwise
     */
    public async delete(id: string): Promise<boolean> {
        const result = await this.repository.delete(id);

        return (result.affected ?? 0) > 0;
    }
}
