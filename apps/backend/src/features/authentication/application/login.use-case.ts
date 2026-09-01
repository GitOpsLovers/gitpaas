import { LoginResult } from '../domain/models/login-result.models';
import { TokenService } from '../domain/ports/token-service.port';
import { RefreshTokensRepository } from '../domain/repositories/refresh-tokens.repository';

import { issueTokensUseCase } from './issue-tokens.use-case';

import { User } from '@features/users/domain/models/user.models';

/**
 * Use case that completes a login for an already-validated user.
 *
 * @param refreshTokensRepository Refresh tokens repository
 * @param tokenService Token signing/verification port
 * @param user The validated user logging in
 *
 * @returns The issued access + refresh token pair, or the challenge of the second factor
 */
export async function loginUseCase(
    refreshTokensRepository: RefreshTokensRepository,
    tokenService: TokenService,
    user: User,
): Promise<LoginResult> {
    if (user.totpEnabledAt !== null) {
        return { twoFactorRequired: true, challengeToken: tokenService.signTwoFactorChallenge(user.id) };
    }

    return issueTokensUseCase(refreshTokensRepository, tokenService, user);
}
