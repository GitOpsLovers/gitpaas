import { createHash, randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';

import {
    AccessTokenPayload,
    IssuedRefreshToken,
    RefreshTokenPayload,
    TwoFactorChallengePayload,
} from '../../domain/models/token-payloads.models';
import { TokenService } from '../../domain/ports/token-service.port';

/**
 * Lifetime of the token that stands between the two steps of a login.
 */
const TWO_FACTOR_CHALLENGE_EXPIRES_IN = '5m';

/**
 * Value of the `typ` claim that marks a token as a challenge of the second factor.
 */
const TWO_FACTOR_CHALLENGE_TYPE = 'two_factor';

/**
 * `@nestjs/jwt`-backed implementation of the {@link TokenService} port.
 */
@Injectable()
export class JwtTokenServiceAdapter implements TokenService {
    private readonly refreshSecret: string;

    private readonly refreshExpiresIn: JwtSignOptions['expiresIn'];

    private readonly twoFactorSecret: string;

    constructor(
        private readonly jwt: JwtService,
        config: ConfigService,
    ) {
        this.refreshSecret = config.getOrThrow<string>('JWT_REFRESH_SECRET');
        this.refreshExpiresIn = config.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN') as JwtSignOptions['expiresIn'];
        this.twoFactorSecret = config.getOrThrow<string>('JWT_2FA_SECRET');
    }

    public signAccessToken(payload: AccessTokenPayload): string {
        return this.jwt.sign(payload);
    }

    public issueRefreshToken(payload: AccessTokenPayload): IssuedRefreshToken {
        const jti = randomUUID();
        const claims: RefreshTokenPayload = { sub: payload.sub, jti };

        const token = this.jwt.sign(claims, {
            secret: this.refreshSecret,
            expiresIn: this.refreshExpiresIn,
        });

        const decoded = this.jwt.decode(token);

        return {
            token,
            jti,
            tokenHash: this.hashRefreshToken(token),
            expiresAt: new Date(decoded.exp * 1000),
        };
    }

    public verifyRefreshToken(token: string): RefreshTokenPayload {
        return this.jwt.verify<RefreshTokenPayload>(token, { secret: this.refreshSecret });
    }

    public hashRefreshToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    public signTwoFactorChallenge(userId: string): string {
        const claims: TwoFactorChallengePayload = { sub: userId, typ: TWO_FACTOR_CHALLENGE_TYPE };

        return this.jwt.sign(claims, {
            secret: this.twoFactorSecret,
            expiresIn: TWO_FACTOR_CHALLENGE_EXPIRES_IN,
        });
    }

    public verifyTwoFactorChallenge(token: string): TwoFactorChallengePayload {
        const payload = this.jwt.verify<TwoFactorChallengePayload>(token, { secret: this.twoFactorSecret });

        if (payload.typ !== TWO_FACTOR_CHALLENGE_TYPE) {
            throw new Error('The token is not a challenge of the second factor');
        }

        return payload;
    }
}
