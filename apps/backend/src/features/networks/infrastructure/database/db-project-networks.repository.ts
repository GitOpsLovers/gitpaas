import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ProjectNetwork } from '../../domain/models/project-network.models';
import { ProjectNetworksRepository } from '../../domain/repositories/project-networks.repository';

import { DbProjectNetworkEntity } from './db-project-network.entity';
import { toProjectNetwork } from './db-project-networks.transformer';

/**
 * Project networks database repository
 */
@Injectable()
export class DatabaseProjectNetworksRepository implements ProjectNetworksRepository {
    constructor(
        @InjectRepository(DbProjectNetworkEntity)
        private readonly repository: Repository<DbProjectNetworkEntity>,
    ) {}

    public async listByProject(projectId: string): Promise<ProjectNetwork[]> {
        const networks = await this.repository.find({
            where: { projectId },
            order: { name: 'ASC' },
        });

        return networks.map(toProjectNetwork);
    }

    public async findById(id: string): Promise<ProjectNetwork | null> {
        const network = await this.repository.findOneBy({ id });

        if (!network) {
            return null;
        }

        return toProjectNetwork(network);
    }

    public async create(network: ProjectNetwork): Promise<ProjectNetwork> {
        const created = this.repository.create({
            id: network.id,
            projectId: network.projectId,
            name: network.name,
            daemonName: network.daemonName,
        });

        const saved = await this.repository.save(created);

        return toProjectNetwork(saved);
    }

    public async rename(id: string, name: string): Promise<ProjectNetwork | null> {
        const network = await this.repository.findOneBy({ id });

        if (!network) {
            return null;
        }

        this.repository.merge(network, { name });

        const saved = await this.repository.save(network);

        return toProjectNetwork(saved);
    }

    public async delete(id: string): Promise<boolean> {
        const result = await this.repository.delete(id);

        return (result.affected ?? 0) > 0;
    }
}
