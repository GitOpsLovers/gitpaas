import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ComposeEnvironmentCacheStore } from '../../domain/ports/compose-environment-cache-store.port';

import { ComposeEnvironmentCache } from '@features/services/domain/models/compose-environment.models';
import { DbServiceEntity } from '@features/services/infrastructure/database/db-service.entity';
import {
    toComposeEnvironmentCache,
    toDbComposeEnvironment,
} from '@features/services/infrastructure/database/db-services.transformer';

/**
 * Database store of the cache of the key `environment` of the compose file of a service
 */
@Injectable()
export class DatabaseComposeEnvironmentCacheAdapter implements ComposeEnvironmentCacheStore {
    constructor(
        @InjectRepository(DbServiceEntity)
        private readonly repository: Repository<DbServiceEntity>,
    ) {}

    public async findByService(serviceId: string): Promise<ComposeEnvironmentCache | null> {
        const service = await this.repository.findOne({
            where: { id: serviceId },
            select: { id: true, composeEnvironment: true },
        });

        return toComposeEnvironmentCache(service?.composeEnvironment ?? null);
    }

    public async forgetName(serviceId: string, name: string): Promise<void> {
        const cache = await this.findByService(serviceId);

        if (!cache || !(name in cache.variables)) {
            return;
        }

        const variables = Object.fromEntries(
            Object.entries(cache.variables).filter(([key]) => key !== name),
        );

        await this.repository.update(serviceId, {
            composeEnvironment: toDbComposeEnvironment({ ...cache, variables }),
        });
    }
}
