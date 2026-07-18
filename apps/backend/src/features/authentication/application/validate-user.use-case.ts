import { InvalidCredentialsError, UserInactiveError } from '../domain/errors/authentication.errors';
import { PasswordHasher } from '../domain/security/password-hasher';

import { User } from '@features/users/domain/models/user.model';
import { UsersRepository } from '@features/users/domain/repositories/users.repository';

/**
 * Use case that validates a set of login credentials: it looks the user up by
 * email, verifies the password against the stored hash and rejects deactivated
 * accounts. Backs the Passport local strategy.
 *
 * @param usersRepository Users repository
 * @param passwordHasher Password hashing port
 * @param email Candidate email
 * @param password Candidate plaintext password
 *
 * @returns The validated user
 *
 * @throws {InvalidCredentialsError} When the email is unknown or the password does not match
 * @throws {UserInactiveError} When the account is deactivated
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
