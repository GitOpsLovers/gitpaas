import { Inject, Injectable } from '@nestjs/common';

import { seedAdminUseCase } from '../../application/seed-admin.use-case';
import { DatabaseUsersRepository } from '../../infrastructure/database/db-users.repository';

import type { UsersRepository } from '@features/users/domain/repositories/users.repository';
import type { PasswordHasher } from '@shared/domain/ports/password-hasher.port';
import { Argon2PasswordHasherAdapter } from '@shared/infrastructure/security/argon2-password-hasher.adapter';

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
     * Add administrative user to the database for local development.
     */
    public async seedDevelopmentAdmin(): Promise<void> {
        try {
            const email = DEV_ADMIN_EMAIL.trim();

            const result = await seedAdminUseCase(this.usersRepository, this.passwordHasher, { email, password: DEV_ADMIN_PASSWORD });

            if (result === 'seeded') {
                console.log(`Seeded admin user "${email}".`);
            } else {
                console.log(`Admin user "${email}" already exists — left unchanged.`);
            }
        } catch (error: unknown) {
            console.error(
                'Development admin seed failed:',
                error instanceof Error ? error.message : error,
            );
        }
    }
}
