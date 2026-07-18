import { createHash, randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';

import { AccessTokenPayload, IssuedRefreshToken, RefreshTokenPayload } from '../../domain/models/token.model';
import { TokenService } from '../../domain/security/token-service';

/**
 * `@nestjs/jwt`-backed implementation of the {@link TokenService} port.
 *
 * Access tokens are signed with the module-configured access secret/expiry;
 * refresh tokens are signed with a separate long-lived secret/expiry and carry
 * a random `jti` correlating them with their persisted, revocable record. The
 * stored refresh hash is a SHA-256 digest — deterministic so it can be looked
 * up and compared without a per-row salt.
 */
@Injectable()
export class JwtTokenService implements TokenService {
    private readonly refreshSecret: string;

    private readonly refreshExpiresIn: JwtSignOptions['expiresIn'];

    constructor(
        private readonly jwt: JwtService,
        config: ConfigService,
    ) {
        this.refreshSecret = config.getOrThrow<string>('JWT_REFRESH_SECRET');
        this.refreshExpiresIn = config.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN') as JwtSignOptions['expiresIn'];
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
}
