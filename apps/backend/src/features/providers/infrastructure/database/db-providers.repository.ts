import type { CreateProviderDto, UpdateProviderDto } from '@gitpaas/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Provider, ProviderCredentials, ProviderType, toProviderType } from '../../domain/models/provider.models';
import { ProvidersRepository } from '../../domain/repositories/providers.repository';

import { DbProviderEntity } from './db-provider.entity';
import { toProvider, toProviderCredentials } from './db-providers.transformer';

import type { SecretCipher } from '@core/domain/ports/secret-cipher.port';
import { SecretCipherAdapter } from '@core/infrastructure/crypto/secret-cipher.adapter';

/**
 * Counts the services a provider holds, reading the `providerId` foreign key that
 * `iac/production/migrations/011_services_provider.sql` adds to the `services` table.
 */
const COUNT_SERVICES_QUERY = 'SELECT COUNT(*)::int AS "count" FROM "services" WHERE "providerId" = $1';

/**
 * Providers database repository
 */
@Injectable()
export class DatabaseProvidersRepository implements ProvidersRepository {
    constructor(
        @InjectRepository(DbProviderEntity)
        private readonly repository: Repository<DbProviderEntity>,
        @Inject(SecretCipherAdapter) private readonly cipher: SecretCipher,
    ) {}

    public async getAll(): Promise<Provider[]> {
        const providers = await this.repository.find({
            order: { createdAt: 'DESC' },
        });

        return providers.map((provider) => toProvider(this.cipher, provider));
    }

    public async findById(id: string): Promise<Provider | null> {
        const provider = await this.repository.findOneBy({ id });

        if (!provider) {
            return null;
        }

        return toProvider(this.cipher, provider);
    }

    public async findByName(name: string): Promise<Provider | null> {
        const provider = await this.repository.findOneBy({ name });

        if (!provider) {
            return null;
        }

        return toProvider(this.cipher, provider);
    }

    public async create(createDto: CreateProviderDto, encryptedPrivateKey: string): Promise<Provider> {
        const provider = this.repository.create({
            name: createDto.name,
            type: createDto.type ? toProviderType(createDto.type) : ProviderType.GithubApp,
            appId: createDto.appId,
            installationId: createDto.installationId,
            encryptedPrivateKey,
        });

        const saved = await this.repository.save(provider);

        return toProvider(this.cipher, saved);
    }

    public async update(
        id: string,
        updateDto: UpdateProviderDto,
        encryptedPrivateKey?: string,
    ): Promise<Provider | null> {
        const provider = await this.repository.findOneBy({ id });

        if (!provider) {
            return null;
        }

        this.repository.merge(provider, {
            ...(updateDto.name === undefined ? {} : { name: updateDto.name }),
            ...(updateDto.type === undefined ? {} : { type: toProviderType(updateDto.type) }),
            ...(updateDto.appId === undefined ? {} : { appId: updateDto.appId }),
            ...(updateDto.installationId === undefined ? {} : { installationId: updateDto.installationId }),
            ...(encryptedPrivateKey === undefined ? {} : { encryptedPrivateKey }),
        });

        const saved = await this.repository.save(provider);

        return toProvider(this.cipher, saved);
    }

    public async delete(id: string): Promise<boolean> {
        const result = await this.repository.delete(id);

        return (result.affected ?? 0) > 0;
    }

    public async countServices(id: string): Promise<number> {
        const rows = await this.repository.manager.query<Array<{ count: number }>>(
            COUNT_SERVICES_QUERY,
            [id],
        );

        return Number(rows[0]?.count ?? 0);
    }

    public async getCredentials(id: string): Promise<ProviderCredentials | null> {
        const provider = await this.repository.findOneBy({ id });

        if (!provider) {
            return null;
        }

        return toProviderCredentials(this.cipher, provider);
    }
}
