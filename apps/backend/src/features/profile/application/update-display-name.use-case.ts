import { ProfileNotFoundError } from '../domain/errors/profile.errors';

import { User } from '@features/users/domain/models/user.models';
import { UsersRepository } from '@features/users/domain/repositories/users.repository';

/**
 * Use case that changes the display name of the account of the user of the token.
 *
 * @param usersRepository Users repository
 * @param userId Identifier of the user of the token
 * @param displayName Display name, or `null` to clear it
 *
 * @returns The updated user
 *
 * @throws {ProfileNotFoundError} When no user carries that identifier
 */
export async function updateDisplayNameUseCase(
    usersRepository: UsersRepository,
    userId: string,
    displayName: string | null,
): Promise<User> {
    const user = await usersRepository.updateDisplayName(userId, displayName);

    if (!user) {
        throw new ProfileNotFoundError();
    }

    return user;
}
