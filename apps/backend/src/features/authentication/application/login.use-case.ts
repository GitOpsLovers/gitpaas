import { AuthTokens } from '../domain/models/auth-tokens.models';
import { TokenService } from '../domain/ports/token-service.port';
import { RefreshTokensRepository } from '../domain/repositories/refresh-tokens.repository';

import { issueTokensUseCase } from './issue-tokens.use-case';

import { User } from '@features/users/domain/models/user.models';

/**
 * Use case that completes a login for an already-validated user by issuing and
 * persisting a fresh token pair. Credential validation is performed upstream by
 * {@link validateUserUseCase} (via the Passport local strategy), keeping this
 * step focused on token issuance.
 *
 * @param refreshTokensRepository Refresh tokens repository
 * @param tokenService Token signing/verification port
 * @param user The validated user logging in
 *
 * @returns The issued access + refresh token pair
 */
export function loginUseCase(
    refreshTokensRepository: RefreshTokensRepository,
    tokenService: TokenService,
    user: User,
): Promise<AuthTokens> {
    return issueTokensUseCase(refreshTokensRepository, tokenService, user);
}
