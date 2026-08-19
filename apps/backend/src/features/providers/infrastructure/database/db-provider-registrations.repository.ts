import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import {
    NewProviderRegistration,
    ProviderRegistration,
    ProviderRegistrationCompletion,
    ProviderRegistrationConversion,
    ProviderRegistrationStep,
} from '../../domain/models/provider-registration.models';
import { Provider, ProviderType } from '../../domain/models/provider.models';
import { ProviderRegistrationsRepository } from '../../domain/repositories/provider-registrations.repository';

import { DbProviderRegistrationEntity } from './db-provider-registration.entity';
import { toProviderRegistration, toSealedProviderRegistrationConversion } from './db-provider-registrations.transformer';
import { DbProviderEntity } from './db-provider.entity';
import { toProvider } from './db-providers.transformer';

import type { SecretCipher } from '@core/domain/ports/secret-cipher.port';
import { SecretCipherAdapter } from '@core/infrastructure/crypto/secret-cipher.adapter';

/**
 * Provider registrations database repository
 */
@Injectable()
export class DatabaseProviderRegistrationsRepository implements ProviderRegistrationsRepository {
    constructor(
        @InjectRepository(DbProviderRegistrationEntity)
        private readonly repository: Repository<DbProviderRegistrationEntity>,
        @Inject(SecretCipherAdapter) private readonly cipher: SecretCipher,
    ) {}

    public async findByState(state: string): Promise<ProviderRegistration | null> {
        const registration = await this.repository.findOneBy({ state });

        if (!registration) {
            return null;
        }

        return toProviderRegistration(registration);
    }

    public async create(newRegistration: NewProviderRegistration): Promise<ProviderRegistration> {
        const registration = this.repository.create({
            state: newRegistration.state,
            name: newRegistration.name,
            ownerType: newRegistration.ownerType,
            ownerLogin: newRegistration.ownerLogin,
            step: ProviderRegistrationStep.AwaitingCreation,
            expiresAt: newRegistration.expiresAt,
        });

        const saved = await this.repository.save(registration);

        return toProviderRegistration(saved);
    }

    public async saveConversion(
        state: string,
        conversion: ProviderRegistrationConversion,
    ): Promise<ProviderRegistration | null> {
        const registration = await this.repository.findOneBy({ state });

        if (!registration) {
            return null;
        }

        this.repository.merge(registration, {
            ...toSealedProviderRegistrationConversion(this.cipher, conversion),
            step: ProviderRegistrationStep.AwaitingInstallation,
        });

        const saved = await this.repository.save(registration);

        return toProviderRegistration(saved);
    }

    public async complete(state: string, completion: ProviderRegistrationCompletion): Promise<Provider> {
        const saved = await this.repository.manager.transaction(async (manager) => {
            const providers = manager.getRepository(DbProviderEntity);

            const provider = await providers.save(providers.create({
                name: completion.name,
                type: ProviderType.GithubApp,
                appId: completion.appId,
                installationId: completion.installationId,
                encryptedPrivateKey: completion.encryptedPrivateKey,
            }));

            await manager.getRepository(DbProviderRegistrationEntity).delete({ state });

            return provider;
        });

        return toProvider(this.cipher, saved);
    }

    public async deleteExpired(now: Date): Promise<number> {
        const result = await this.repository.delete({ expiresAt: LessThan(now) });

        return result.affected ?? 0;
    }
}
