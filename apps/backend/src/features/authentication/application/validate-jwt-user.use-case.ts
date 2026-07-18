import { InvalidCredentialsError, UserInactiveError } from '../domain/errors/authentication.errors';

import { User } from '@features/users/domain/models/user.model';
import { UsersRepository } from '@features/users/domain/repositories/users.repository';

/**
 * Use case that resolves the user referenced by a verified access token,
 * ensuring the account still exists and is active. Backs the Passport JWT
 * strategy, so a deactivated user is rejected on the very next request.
 *
 * @param usersRepository Users repository
 * @param userId Subject (`sub`) claim of the verified access token
 *
 * @returns The authenticated user
 *
 * @throws {InvalidCredentialsError} When the user no longer exists
 * @throws {UserInactiveError} When the account is deactivated
 */
export async function validateJwtUserUseCase(usersRepository: UsersRepository, userId: string): Promise<User> {
    const user = await usersRepository.findById(userId);

    if (!user) {
        throw new InvalidCredentialsError();
    }

    if (!user.isActive) {
        throw new UserInactiveError();
    }

    return user;
}
