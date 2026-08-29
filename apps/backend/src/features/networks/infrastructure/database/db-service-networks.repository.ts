import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ProjectNetwork } from '../../domain/models/project-network.models';
import { ServiceNetworksRepository } from '../../domain/repositories/service-networks.repository';

import { toProjectNetwork } from './db-project-networks.transformer';
import { DbServiceNetworkEntity } from './db-service-network.entity';

/**
 * Service networks database repository
 */
@Injectable()
export class DatabaseServiceNetworksRepository implements ServiceNetworksRepository {
    constructor(
        @InjectRepository(DbServiceNetworkEntity)
        private readonly repository: Repository<DbServiceNetworkEntity>,
    ) {}

    public async listByService(serviceId: string): Promise<ProjectNetwork[]> {
        const joins = await this.repository.find({
            where: { serviceId },
            relations: { network: true },
            order: { network: { name: 'ASC' } },
        });

        return joins.flatMap((join) => (join.network ? [toProjectNetwork(join.network)] : []));
    }

    public async listServiceIds(networkId: string): Promise<string[]> {
        const joins = await this.repository.find({
            where: { networkId },
            order: { serviceId: 'ASC' },
        });

        return joins.map((join) => join.serviceId);
    }

    public async join(serviceId: string, networkId: string): Promise<void> {
        const existing = await this.repository.findOneBy({ serviceId, networkId });

        if (existing) {
            return;
        }

        await this.repository.save(this.repository.create({ serviceId, networkId }));
    }

    public async leave(serviceId: string, networkId: string): Promise<boolean> {
        const result = await this.repository.delete({ serviceId, networkId });

        return (result.affected ?? 0) > 0;
    }
}
