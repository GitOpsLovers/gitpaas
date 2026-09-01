import { EmailTakenError, ProfileNotFoundError } from '../domain/errors/profile.errors';

import { issueTokensUseCase } from '@features/authentication/application/issue-tokens.use-case';
import { AuthTokens } from '@features/authentication/domain/models/auth-tokens.models';
import { TokenService } from '@features/authentication/domain/ports/token-service.port';
import { RefreshTokensRepository } from '@features/authentication/domain/repositories/refresh-tokens.repository';
import { UsersRepository } from '@features/users/domain/repositories/users.repository';

/**
 * Use case that changes the email address of the account of the user of the token.
 *
 * @param usersRepository Users repository
 * @param refreshTokensRepository Refresh tokens repository
 * @param tokenService Token signing/verification port
 * @param userId Identifier of the user of the token
 * @param email The email address to write
 *
 * @returns A freshly issued access + refresh token pair
 *
 * @throws {EmailTakenError} When another user already holds that address
 * @throws {ProfileNotFoundError} When no user carries that identifier
 */
export async function changeEmailUseCase(
    usersRepository: UsersRepository,
    refreshTokensRepository: RefreshTokensRepository,
    tokenService: TokenService,
    userId: string,
    email: string,
): Promise<AuthTokens> {
    const holder = await usersRepository.findByEmail(email);

    if (holder && holder.id !== userId) {
        throw new EmailTakenError(email);
    }

    const user = await usersRepository.updateEmail(userId, email);

    if (!user) {
        throw new ProfileNotFoundError();
    }

    return issueTokensUseCase(refreshTokensRepository, tokenService, user);
}
