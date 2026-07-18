import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';

import { loginUseCase } from '../../application/login.use-case';
import { logoutUseCase } from '../../application/logout.use-case';
import { refreshUseCase } from '../../application/refresh.use-case';
import { InvalidRefreshTokenError, UserInactiveError } from '../../domain/errors/authentication.errors';
import { AuthTokens } from '../../domain/models/auth-tokens.model';
import type { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens.repository';
import type { TokenService } from '../../domain/security/token-service';
import { RefreshTokensDatabaseRepository } from '../../infrastructure/database/refresh-tokens-db.repository';
import { JwtTokenService } from '../../infrastructure/security/jwt-token.service';

import { User } from '@features/users/domain/models/user.model';
import type { UsersRepository } from '@features/users/domain/repositories/users.repository';
import { UsersDatabaseRepository } from '@features/users/infrastructure/database/users-db.repository';

/**
 * Public projection of a user, exposed by `GET /auth/me` — never carries the
 * password hash.
 */
export type AuthenticatedUser = Omit<User, 'passwordHash'>;

/**
 * Authentication service
 */
@Injectable()
export class AuthenticationService {
    constructor(
        @Inject(UsersDatabaseRepository)
        private readonly usersRepository: UsersRepository,
        @Inject(RefreshTokensDatabaseRepository)
        private readonly refreshTokensRepository: RefreshTokensRepository,
        @Inject(JwtTokenService)
        private readonly tokenService: TokenService,
    ) {}

    /**
     * Issue a token pair for a user already validated by the local strategy
     *
     * @param user Authenticated user
     *
     * @returns Access + refresh token pair
     */
    public login(user: User): Promise<AuthTokens> {
        return loginUseCase(this.refreshTokensRepository, this.tokenService, user);
    }

    /**
     * Rotate a refresh token, returning a fresh token pair
     *
     * @param refreshToken The refresh token presented by the client
     *
     * @returns A freshly issued access + refresh token pair
     */
    public async refresh(refreshToken: string): Promise<AuthTokens> {
        try {
            return await refreshUseCase(
                this.usersRepository,
                this.refreshTokensRepository,
                this.tokenService,
                refreshToken,
            );
        } catch (error) {
            if (error instanceof InvalidRefreshTokenError || error instanceof UserInactiveError) {
                throw new UnauthorizedException(error.message);
            }

            throw error;
        }
    }

    /**
     * Revoke the presented refresh token (idempotent)
     *
     * @param refreshToken The refresh token to revoke
     */
    public logout(refreshToken: string): Promise<void> {
        return logoutUseCase(this.refreshTokensRepository, this.tokenService, refreshToken);
    }

    /**
     * Project the authenticated user into its public view
     *
     * @param user Authenticated user attached to the request
     *
     * @returns The user without its password hash
     */
    public me(user: User): AuthenticatedUser {
        const { passwordHash: _passwordHash, ...view } = user;

        return view;
    }
}
