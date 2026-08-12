import { InvalidRefreshTokenError, UserInactiveError } from '../domain/errors/authentication.errors';
import { AuthTokens } from '../domain/models/auth-tokens.models';
import { RefreshTokenPayload } from '../domain/models/token-payloads.models';
import { TokenService } from '../domain/ports/token-service.port';
import { RefreshTokensRepository } from '../domain/repositories/refresh-tokens.repository';

import { issueTokensUseCase } from './issue-tokens.use-case';

import { UsersRepository } from '@features/users/domain/repositories/users.repository';

/**
 * Use case that rotates a refresh token.
 *
 * @param usersRepository Users repository
 * @param refreshTokensRepository Refresh tokens repository
 * @param tokenService Token signing/verification port
 * @param rawToken The refresh token presented by the client
 *
 * @returns A freshly issued access + refresh token pair
 */
export async function refreshUseCase(
    usersRepository: UsersRepository,
    refreshTokensRepository: RefreshTokensRepository,
    tokenService: TokenService,
    rawToken: string,
): Promise<AuthTokens> {
    let payload: RefreshTokenPayload;

    try {
        payload = tokenService.verifyRefreshToken(rawToken);
    } catch (error: unknown) {
        throw new InvalidRefreshTokenError({ cause: error });
    }

    const stored = await refreshTokensRepository.findByJti(payload.jti);

    if (!stored || stored.revoked || stored.expiresAt.getTime() <= Date.now()) {
        throw new InvalidRefreshTokenError();
    }

    if (stored.tokenHash !== tokenService.hashRefreshToken(rawToken)) {
        throw new InvalidRefreshTokenError();
    }

    const user = await usersRepository.findById(stored.userId);

    if (!user) {
        throw new InvalidRefreshTokenError();
    }

    if (!user.isActive) {
        throw new UserInactiveError();
    }

    await refreshTokensRepository.revoke(stored.id);

    return issueTokensUseCase(refreshTokensRepository, tokenService, user);
}
