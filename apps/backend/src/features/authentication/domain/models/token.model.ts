import { UserRole } from '@features/users/domain/models/user.model';

/**
 * Claims carried by a signed access token.
 */
export interface AccessTokenPayload {
    sub: string;
    email: string;
    role: UserRole;
}

/**
 * Claims carried by a signed refresh token. The `jti` correlates the token with
 * its persisted, revocable record.
 */
export interface RefreshTokenPayload {
    sub: string;
    jti: string;
}

/**
 * A freshly minted refresh token together with the metadata needed to persist
 * its revocable record.
 */
export interface IssuedRefreshToken {
    token: string;
    jti: string;
    tokenHash: string;
    expiresAt: Date;
}
