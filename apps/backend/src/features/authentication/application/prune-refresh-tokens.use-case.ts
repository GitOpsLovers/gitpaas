import { MAX_ACTIVE_REFRESH_TOKENS_PER_USER } from '../domain/constants/refresh-token.constants';
import { RefreshTokensRepository } from '../domain/repositories/refresh-tokens.repository';

/**
 * Use case that caps the live refresh tokens of one user.
 *
 * @param refreshTokensRepository Refresh tokens repository
 * @param userId Identifier of the user whose tokens the cap applies to
 *
 * @returns Number of tokens revoked
 */
export async function pruneRefreshTokensUseCase(
    refreshTokensRepository: RefreshTokensRepository,
    userId: string,
): Promise<number> {
    const active = await refreshTokensRepository.findActiveForUser(userId);

    if (active.length <= MAX_ACTIVE_REFRESH_TOKENS_PER_USER) {
        return 0;
    }

    const excess = active.slice(0, active.length - MAX_ACTIVE_REFRESH_TOKENS_PER_USER);

    return refreshTokensRepository.revokeMany(excess.map((token) => token.id));
}
