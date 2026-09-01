import { UserRole } from '@features/users/domain/models/user.models';

/**
 * Claims carried by a signed access token.
 */
export interface AccessTokenPayload {
    sub: string;
    email: string;
    role: UserRole;
}

/**
 * Claims carried by a signed refresh token.
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

/**
 * Claims carried by the short-lived token that stands between the two steps of a login.
 */
export interface TwoFactorChallengePayload {
    sub: string;
    typ: 'two_factor';
}
