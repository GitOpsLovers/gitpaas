import { Inject, Injectable } from '@nestjs/common';

import { disableUserTotpUseCase } from '../../application/disable-user-totp.use-case';
import { seedAdminUseCase } from '../../application/seed-admin.use-case';
import { User } from '../../domain/models/user.models';
import { DatabaseUsersRepository } from '../../infrastructure/database/db-users.repository';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';
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
        @Inject(NestLoggerAdapter)
        private readonly logger: AppLogger,
    ) {}

    /**
     * Add administrative user to the database for local development.
     */
    public async seedDevelopmentAdmin(): Promise<void> {
        try {
            const email = DEV_ADMIN_EMAIL.trim();

            const result = await seedAdminUseCase(this.usersRepository, this.passwordHasher, { email, password: DEV_ADMIN_PASSWORD });

            if (result === 'seeded') {
                this.logger.log(`Seeded admin user "${email}".`, UsersService.name);
            } else {
                this.logger.log(`Admin user "${email}" already exists — left unchanged.`, UsersService.name);
            }
        } catch (error: unknown) {
            this.logger.error(
                'Development admin seed failed:',
                error,
                UsersService.name,
            );
        }
    }

    /**
     * Turn the second factor off for a user, freeing an account whose owner lost its authenticator.
     *
     * @param id Identifier of the user the second factor is cleared for
     *
     * @returns The updated user
     *
     * @throws {UserNotFoundError} When no user carries that identifier
     */
    public disableTotp(id: string): Promise<User> {
        return disableUserTotpUseCase(this.usersRepository, id);
    }
}
