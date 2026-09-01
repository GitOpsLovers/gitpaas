import { ProfileNotFoundError } from '../domain/errors/profile.errors';

import { User } from '@features/users/domain/models/user.models';
import { UsersRepository } from '@features/users/domain/repositories/users.repository';

/**
 * Use case that reads the account of the user of the token again.
 *
 * @param usersRepository Users repository
 * @param userId Identifier of the user of the token
 *
 * @returns The stored user
 *
 * @throws {ProfileNotFoundError} When no user carries that identifier
 */
export async function getProfileUseCase(usersRepository: UsersRepository, userId: string): Promise<User> {
    const user = await usersRepository.findById(userId);

    if (!user) {
        throw new ProfileNotFoundError();
    }

    return user;
}
