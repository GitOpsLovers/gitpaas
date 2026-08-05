import { Inject, Injectable } from '@nestjs/common';

import { SeedAdminInput, seedAdminUseCase } from '../../application/seed-admin.use-case';
import { DatabaseUsersRepository } from '../../infrastructure/database/db-users.repository';

import type { PasswordHasher } from '@core/domain/ports/password-hasher.port';
import { Argon2PasswordHasherAdapter } from '@core/infrastructure/security/argon2-password-hasher.adapter';
import type { UsersRepository } from '@features/users/domain/repositories/users.repository';

/**
 * Fixed local-development admin credentials.
 */
const DEV_ADMIN_EMAIL = 'admin@gitpaas.dev';
const DEV_ADMIN_PASSWORD = 'gitpaas';

/**
 * Users feature service.
 */
@Injectable()
export class UsersService {
    constructor(
        @Inject(DatabaseUsersRepository)
        private readonly usersRepository: UsersRepository,
        @Inject(Argon2PasswordHasherAdapter)
        private readonly passwordHasher: PasswordHasher,
    ) {}

    /**
     * Provision a single administrator, hashing the password with argon2id and
     * persisting through the users repository. Idempotent: an existing admin is
     * left untouched and its password is NOT rotated.
     *
     * @param input The admin credentials to seed
     */
    public async seedAdmin(input: SeedAdminInput): Promise<void> {
        const email = input.email.trim();

        const result = await seedAdminUseCase(this.usersRepository, this.passwordHasher, input);

        if (result === 'seeded') {
            console.log(`Seeded admin user "${email}".`);
        } else {
            console.log(`Admin user "${email}" already exists — left unchanged.`);
        }
    }

    /**
     * Development-only convenience seeding.
     */
    public async seedDevelopmentAdmin(): Promise<void> {
        try {
            await this.seedAdmin({ email: DEV_ADMIN_EMAIL, password: DEV_ADMIN_PASSWORD });
        } catch (error: unknown) {
            console.error(
                'Development admin seed failed:',
                error instanceof Error ? error.message : error,
            );
        }
    }
}
