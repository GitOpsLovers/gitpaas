import { InvalidRefreshTokenError, UserInactiveError } from '../domain/errors/authentication.errors';
import { AuthTokens } from '../domain/models/auth-tokens.model';
import { RefreshTokenPayload } from '../domain/models/token.model';
import { RefreshTokensRepository } from '../domain/repositories/refresh-tokens.repository';
import { TokenService } from '../domain/security/token-service';

import { issueTokensUseCase } from './issue-tokens.use-case';

import { UsersRepository } from '@features/users/domain/repositories/users.repository';

/**
 * Use case that rotates a refresh token: it verifies the token's signature and
 * expiry, matches it against its stored (hashed, non-revoked, unexpired)
 * record, revokes that record and issues a brand-new token pair. A replayed or
 * already-rotated token is rejected.
 *
 * @param usersRepository Users repository
 * @param refreshTokensRepository Refresh tokens repository
 * @param tokenService Token signing/verification port
 * @param rawToken The refresh token presented by the client
 *
 * @returns A freshly issued access + refresh token pair
 *
 * @throws {InvalidRefreshTokenError} When the token is invalid, revoked, expired or unknown
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
    } catch {
        throw new InvalidRefreshTokenError();
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
