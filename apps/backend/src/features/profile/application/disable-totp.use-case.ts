import { ProfileNotFoundError } from '../domain/errors/profile.errors';

import { User } from '@features/users/domain/models/user.models';
import { UsersRepository } from '@features/users/domain/repositories/users.repository';

/**
 * Use case that turns the second factor off for the user of the token.
 *
 * @param usersRepository Users repository
 * @param userId Identifier of the user of the token
 *
 * @returns The updated user
 *
 * @throws {ProfileNotFoundError} When no user carries that identifier
 */
export async function disableTotpUseCase(usersRepository: UsersRepository, userId: string): Promise<User> {
    const user = await usersRepository.updateTotp(userId, null, null);

    if (!user) {
        throw new ProfileNotFoundError();
    }

    return user;
}
