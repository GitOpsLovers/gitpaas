import { Inject, Injectable } from '@nestjs/common';

import { loginUseCase } from '../../application/login.use-case';
import { logoutUseCase } from '../../application/logout.use-case';
import { refreshUseCase } from '../../application/refresh.use-case';
import { verifyTwoFactorUseCase } from '../../application/verify-two-factor.use-case';
import { AuthTokens } from '../../domain/models/auth-tokens.models';
import { LoginResult } from '../../domain/models/login-result.models';
import type { TokenService } from '../../domain/ports/token-service.port';
import type { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens.repository';
import { DatabaseRefreshTokensRepository } from '../../infrastructure/database/db-refresh-tokens.repository';
import { JwtTokenServiceAdapter } from '../../infrastructure/security/jwt-token-service.adapter';
import { enrichWithAuthOutcome, enrichWithTokenSubject } from '../telemetry/enrich-with-actor';

import type { SecretCipher } from '@core/domain/ports/secret-cipher.port';
import type { Totp } from '@core/domain/ports/totp.port';
import { OtplibTotpAdapter } from '@core/infrastructure/crypto/otplib-totp.adapter';
import { SecretCipherAdapter } from '@core/infrastructure/crypto/secret-cipher.adapter';
import { User } from '@features/users/domain/models/user.models';
import type { UsersRepository } from '@features/users/domain/repositories/users.repository';
import { DatabaseUsersRepository } from '@features/users/infrastructure/database/db-users.repository';

/**
 * Authentication service
 */
@Injectable()
export class AuthenticationService {
    constructor(
        @Inject(DatabaseUsersRepository)
        private readonly usersRepository: UsersRepository,
        @Inject(DatabaseRefreshTokensRepository)
        private readonly refreshTokensRepository: RefreshTokensRepository,
        @Inject(JwtTokenServiceAdapter)
        private readonly tokenService: TokenService,
        @Inject(OtplibTotpAdapter)
        private readonly totp: Totp,
        @Inject(SecretCipherAdapter)
        private readonly secretCipher: SecretCipher,
    ) {}

    /**
     * Complete the first step of a login for a user already validated by the local strategy
     *
     * @param user Authenticated user
     *
     * @returns Access + refresh token pair, or the challenge of the second factor
     */
    public async login(user: User): Promise<LoginResult> {
        const result = await loginUseCase(this.refreshTokensRepository, this.tokenService, user);

        enrichWithAuthOutcome('authenticated');

        return result;
    }

    /**
     * Complete the second step of a login, exchanging a challenge and a code for a token pair
     *
     * @param challengeToken The challenge the first step handed out
     * @param code The code of six digits the client presented
     *
     * @returns A freshly issued access + refresh token pair
     *
     * @throws {InvalidTwoFactorChallengeError} When the challenge is unusable
     * @throws {UserInactiveError} When the owning account is deactivated
     * @throws {InvalidTotpCodeError} When the code does not match the secret of the account
     */
    public async verifyTwoFactor(challengeToken: string, code: string): Promise<AuthTokens> {
        try {
            const tokens = await verifyTwoFactorUseCase(
                this.usersRepository,
                this.refreshTokensRepository,
                this.tokenService,
                this.totp,
                this.secretCipher,
                challengeToken,
                code,
            );

            enrichWithAuthOutcome('authenticated');

            return tokens;
        } catch (error) {
            enrichWithAuthOutcome('rejected');

            throw error;
        }
    }

    /**
     * Rotate a refresh token, returning a fresh token pair
     *
     * @param refreshToken The refresh token presented by the client
     *
     * @returns A freshly issued access + refresh token pair
     *
     * @throws {InvalidRefreshTokenError} When the token is invalid, revoked, expired or unknown
     * @throws {UserInactiveError} When the owning account is deactivated
     */
    public async refresh(refreshToken: string): Promise<AuthTokens> {
        enrichWithTokenSubject(this.tokenService, refreshToken);

        try {
            const tokens = await refreshUseCase(
                this.usersRepository,
                this.refreshTokensRepository,
                this.tokenService,
                refreshToken,
            );

            enrichWithAuthOutcome('authenticated');

            return tokens;
        } catch (error) {
            enrichWithAuthOutcome('rejected');

            throw error;
        }
    }

    /**
     * Revoke the presented refresh token (idempotent)
     *
     * @param refreshToken The refresh token to revoke
     */
    public async logout(refreshToken: string): Promise<void> {
        const identified = enrichWithTokenSubject(this.tokenService, refreshToken);

        enrichWithAuthOutcome(identified ? 'authenticated' : 'rejected');

        await logoutUseCase(this.refreshTokensRepository, this.tokenService, refreshToken);
    }

    /**
     * Project the authenticated user into its public view
     *
     * @param user Authenticated user attached to the request
     *
     * @returns The user without its password hash
     */
    public me(user: User): Omit<User, 'passwordHash'> {
        const { passwordHash: _passwordHash, ...view } = user;

        return view;
    }
}
