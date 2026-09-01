import { InvalidCurrentPasswordError, ProfileNotFoundError } from '../domain/errors/profile.errors';

import { issueTokensUseCase } from '@features/authentication/application/issue-tokens.use-case';
import { AuthTokens } from '@features/authentication/domain/models/auth-tokens.models';
import { TokenService } from '@features/authentication/domain/ports/token-service.port';
import { RefreshTokensRepository } from '@features/authentication/domain/repositories/refresh-tokens.repository';
import { UsersRepository } from '@features/users/domain/repositories/users.repository';
import { PasswordHasher } from '@shared/domain/ports/password-hasher.port';

/**
 * Use case that changes the password of the account of the user of the token.
 *
 * @param usersRepository Users repository
 * @param refreshTokensRepository Refresh tokens repository
 * @param tokenService Token signing/verification port
 * @param passwordHasher Password hashing port
 * @param userId Identifier of the user of the token
 * @param currentPassword The password the account holds today
 * @param newPassword The password to write
 *
 * @returns A freshly issued access + refresh token pair
 *
 * @throws {ProfileNotFoundError} When no user carries that identifier
 * @throws {InvalidCurrentPasswordError} When the current password does not match
 */
export async function changePasswordUseCase(
    usersRepository: UsersRepository,
    refreshTokensRepository: RefreshTokensRepository,
    tokenService: TokenService,
    passwordHasher: PasswordHasher,
    userId: string,
    currentPassword: string,
    newPassword: string,
): Promise<AuthTokens> {
    const current = await usersRepository.findById(userId);

    if (!current) {
        throw new ProfileNotFoundError();
    }

    const passwordMatches = await passwordHasher.verify(current.passwordHash, currentPassword);

    if (!passwordMatches) {
        throw new InvalidCurrentPasswordError();
    }

    const passwordHash = await passwordHasher.hash(newPassword);
    const user = await usersRepository.updatePasswordHash(userId, passwordHash);

    if (!user) {
        throw new ProfileNotFoundError();
    }

    // Revoked before the pair is issued, so the fresh refresh token survives the sweep.
    await refreshTokensRepository.revokeAllForUser(userId);

    return issueTokensUseCase(refreshTokensRepository, tokenService, user);
}
