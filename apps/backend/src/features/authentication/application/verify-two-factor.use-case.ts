import {
    InvalidTotpCodeError,
    InvalidTwoFactorChallengeError,
    UserInactiveError,
} from '../domain/errors/authentication.errors';
import { AuthTokens } from '../domain/models/auth-tokens.models';
import { TokenService } from '../domain/ports/token-service.port';
import { RefreshTokensRepository } from '../domain/repositories/refresh-tokens.repository';

import { issueTokensUseCase } from './issue-tokens.use-case';

import { SecretCipher } from '@core/domain/ports/secret-cipher.port';
import { Totp } from '@core/domain/ports/totp.port';
import { UsersRepository } from '@features/users/domain/repositories/users.repository';

/**
 * Use case that completes the second step of a login.
 *
 * @param usersRepository Users repository
 * @param refreshTokensRepository Refresh tokens repository
 * @param tokenService Token signing/verification port
 * @param totp One-time password port
 * @param secretCipher Secret cipher port, which opens the stored secret
 * @param challengeToken The challenge the first step handed out
 * @param code The code of six digits the client presented
 *
 * @returns The issued access + refresh token pair
 *
 * @throws {InvalidTwoFactorChallengeError} When the challenge is unusable, or names no account with a second factor
 * @throws {UserInactiveError} When the account is deactivated
 * @throws {InvalidTotpCodeError} When the code does not match the secret of the account
 */
export async function verifyTwoFactorUseCase(
    usersRepository: UsersRepository,
    refreshTokensRepository: RefreshTokensRepository,
    tokenService: TokenService,
    totp: Totp,
    secretCipher: SecretCipher,
    challengeToken: string,
    code: string,
): Promise<AuthTokens> {
    let userId: string;

    try {
        userId = tokenService.verifyTwoFactorChallenge(challengeToken).sub;
    } catch (error) {
        throw new InvalidTwoFactorChallengeError({ cause: error });
    }

    const user = await usersRepository.findById(userId);

    if (!user) {
        throw new InvalidTwoFactorChallengeError();
    }

    if (!user.isActive) {
        throw new UserInactiveError();
    }

    if (user.totpEnabledAt === null || user.totpSecret === null) {
        throw new InvalidTwoFactorChallengeError();
    }

    if (!(await totp.verifyCode(secretCipher.decryptSecret(user.totpSecret), code))) {
        throw new InvalidTotpCodeError();
    }

    return issueTokensUseCase(refreshTokensRepository, tokenService, user);
}
