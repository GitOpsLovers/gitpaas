import { DECOY_PASSWORD_HASH } from '../domain/constants/credentials.constants';
import { InvalidCredentialsError } from '../domain/errors/authentication.errors';

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
 *
 * @throws {InvalidCredentialsError} When the email is unknown, the password does not match, or the account is deactivated
 */
export async function validateUserUseCase(
    usersRepository: UsersRepository,
    passwordHasher: PasswordHasher,
    email: string,
    password: string,
): Promise<User> {
    const user = await usersRepository.findByEmail(email);

    const passwordMatches = await passwordHasher.verify(user?.passwordHash ?? DECOY_PASSWORD_HASH, password);

    if (!user || !passwordMatches || !user.isActive) {
        throw new InvalidCredentialsError();
    }

    return user;
}
