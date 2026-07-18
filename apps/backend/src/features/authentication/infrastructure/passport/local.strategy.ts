import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import { validateUserUseCase } from '../../application/validate-user.use-case';
import { InvalidCredentialsError, UserInactiveError } from '../../domain/errors/authentication.errors';
import type { PasswordHasher } from '../../domain/security/password-hasher';
import { Argon2PasswordHasher } from '../security/argon2-password-hasher';

import { User } from '@features/users/domain/models/user.model';
import type { UsersRepository } from '@features/users/domain/repositories/users.repository';
import { UsersDatabaseRepository } from '@features/users/infrastructure/database/users-db.repository';

/**
 * Passport local strategy backing `POST /auth/login`. Validates the submitted
 * email/password and attaches the resolved user to the request; invalid
 * credentials or a deactivated account become a `401`.
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(
        @Inject(UsersDatabaseRepository)
        private readonly usersRepository: UsersRepository,
        @Inject(Argon2PasswordHasher)
        private readonly passwordHasher: PasswordHasher,
    ) {
        super({ usernameField: 'email' });
    }

    /**
     * Validate a login attempt.
     *
     * @param email Submitted email (mapped from the `email` field)
     * @param password Submitted plaintext password
     *
     * @returns The authenticated user, attached to `request.user`
     */
    public async validate(email: string, password: string): Promise<User> {
        try {
            return await validateUserUseCase(this.usersRepository, this.passwordHasher, email, password);
        } catch (error) {
            if (error instanceof InvalidCredentialsError || error instanceof UserInactiveError) {
                throw new UnauthorizedException(error.message);
            }

            throw error;
        }
    }
}
