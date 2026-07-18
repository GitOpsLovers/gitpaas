import { RefreshTokenPayload } from '../domain/models/token.model';
import { RefreshTokensRepository } from '../domain/repositories/refresh-tokens.repository';
import { TokenService } from '../domain/security/token-service';

/**
 * Use case that logs a client out by revoking the presented refresh token's
 * record. Idempotent: an unknown, malformed or already-revoked token is treated
 * as a successful logout so the endpoint never leaks token validity.
 *
 * @param refreshTokensRepository Refresh tokens repository
 * @param tokenService Token signing/verification port
 * @param rawToken The refresh token to revoke
 */
export async function logoutUseCase(
    refreshTokensRepository: RefreshTokensRepository,
    tokenService: TokenService,
    rawToken: string,
): Promise<void> {
    let payload: RefreshTokenPayload;

    try {
        payload = tokenService.verifyRefreshToken(rawToken);
    } catch {
        return;
    }

    const stored = await refreshTokensRepository.findByJti(payload.jti);

    if (stored && !stored.revoked) {
        await refreshTokensRepository.revoke(stored.id);
    }
}
