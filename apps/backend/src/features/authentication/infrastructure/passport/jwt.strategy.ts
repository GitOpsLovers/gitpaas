import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { validateJwtUserUseCase } from '../../application/validate-jwt-user.use-case';
import { InvalidCredentialsError, UserInactiveError } from '../../domain/errors/authentication.errors';
import { AccessTokenPayload } from '../../domain/models/token.model';

import { User } from '@features/users/domain/models/user.model';
import type { UsersRepository } from '@features/users/domain/repositories/users.repository';
import { UsersDatabaseRepository } from '@features/users/infrastructure/database/users-db.repository';

/**
 * Passport JWT strategy backing the global access-token guard. Verifies the
 * bearer token's signature/expiry, then resolves and re-checks the referenced
 * user so a deactivated account is rejected on its next request.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        @Inject(UsersDatabaseRepository)
        private readonly usersRepository: UsersRepository,
        config: ConfigService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        });
    }

    /**
     * Resolve the authenticated user for a verified access token.
     *
     * @param payload Verified access token claims
     *
     * @returns The authenticated user, attached to `request.user`
     */
    public async validate(payload: AccessTokenPayload): Promise<User> {
        try {
            return await validateJwtUserUseCase(this.usersRepository, payload.sub);
        } catch (error) {
            if (error instanceof InvalidCredentialsError || error instanceof UserInactiveError) {
                throw new UnauthorizedException(error.message);
            }

            throw error;
        }
    }
}
