import { AuthTokens } from '../domain/models/auth-tokens.model';
import { RefreshTokensRepository } from '../domain/repositories/refresh-tokens.repository';
import { TokenService } from '../domain/security/token-service';

import { User } from '@features/users/domain/models/user.model';

/**
 * Use case that mints a fresh access + refresh token pair for a user and
 * persists the refresh token's revocable record (storing only its hash). Shared
 * by the login and refresh flows.
 *
 * @param refreshTokensRepository Refresh tokens repository
 * @param tokenService Token signing/verification port
 * @param user User the tokens are issued for
 *
 * @returns The issued access + refresh token pair
 */
export async function issueTokensUseCase(
    refreshTokensRepository: RefreshTokensRepository,
    tokenService: TokenService,
    user: User,
): Promise<AuthTokens> {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = tokenService.signAccessToken(payload);
    const refreshToken = tokenService.issueRefreshToken(payload);

    await refreshTokensRepository.create({
        userId: user.id,
        jti: refreshToken.jti,
        tokenHash: refreshToken.tokenHash,
        expiresAt: refreshToken.expiresAt,
    });

    return { accessToken, refreshToken: refreshToken.token };
}
