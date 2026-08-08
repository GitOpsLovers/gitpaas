import { InvalidCredentialsError, UserInactiveError } from '../domain/errors/authentication.errors';

import { User } from '@features/users/domain/models/user.models';
import { UsersRepository } from '@features/users/domain/repositories/users.repository';
import { PasswordHasher } from '@shared/domain/ports/password-hasher.port';

/**
 * Use case that validates a set of login credentials.
 *
 * @param usersRepository Users repository
 * @param passwordHasher Password hashing port
 * @param email Candidate email
 * @param password Candidate password
 *
 * @returns The validated user
 */
export async function validateUserUseCase(
    usersRepository: UsersRepository,
    passwordHasher: PasswordHasher,
    email: string,
    password: string,
): Promise<User> {
    const user = await usersRepository.findByEmail(email);

    if (!user) {
        throw new InvalidCredentialsError();
    }

    const passwordMatches = await passwordHasher.verify(user.passwordHash, password);

    if (!passwordMatches) {
        throw new InvalidCredentialsError();
    }

    if (!user.isActive) {
        throw new UserInactiveError();
    }

    return user;
}
