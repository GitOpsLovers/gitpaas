import { UserNotFoundError } from '../domain/errors/users.errors';
import { User } from '../domain/models/user.models';
import { UsersRepository } from '../domain/repositories/users.repository';

/**
 * Use case that turns the second factor off for any user.
 *
 * @param usersRepository Users repository
 * @param id Identifier of the user the second factor is cleared for
 *
 * @returns The updated user
 *
 * @throws {UserNotFoundError} When no user carries that identifier
 */
export async function disableUserTotpUseCase(usersRepository: UsersRepository, id: string): Promise<User> {
    const user = await usersRepository.updateTotp(id, null, null);

    if (!user) {
        throw new UserNotFoundError(id);
    }

    return user;
}
