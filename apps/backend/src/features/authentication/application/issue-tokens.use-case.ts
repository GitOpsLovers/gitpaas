import { AuthTokens } from '../domain/models/auth-tokens.models';
import { TokenService } from '../domain/ports/token-service.port';
import { RefreshTokensRepository } from '../domain/repositories/refresh-tokens.repository';

import { pruneRefreshTokensUseCase } from './prune-refresh-tokens.use-case';

import { User } from '@features/users/domain/models/user.models';

/**
 * Use case that mints a fresh access + refresh token pair for a user.
 *
 * @param refreshTokensRepository Refresh tokens repository
 * @param tokenService Token signing/verification port
 * @param user User the tokens are issued for
 * @param familyId Family the rotated token belongs to; a login passes none, and the new token opens its own
 *
 * @returns The issued access + refresh token pair
 */
export async function issueTokensUseCase(
    refreshTokensRepository: RefreshTokensRepository,
    tokenService: TokenService,
    user: User,
    familyId?: string,
): Promise<AuthTokens> {
    const payload = { sub: user.id, email: user.email };

    const accessToken = tokenService.signAccessToken(payload);
    const refreshToken = tokenService.issueRefreshToken(payload);

    await refreshTokensRepository.create({
        userId: user.id,
        jti: refreshToken.jti,
        familyId: familyId ?? refreshToken.jti,
        tokenHash: refreshToken.tokenHash,
        expiresAt: refreshToken.expiresAt,
    });

    await pruneRefreshTokensUseCase(refreshTokensRepository, user.id);

    return { accessToken, refreshToken: refreshToken.token };
}
