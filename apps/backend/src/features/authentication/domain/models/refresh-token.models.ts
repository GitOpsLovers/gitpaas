/**
 * A persisted, revocable refresh token. Only the token's hash is stored, so a
 * database leak never exposes a usable token. Rotated on every refresh.
 */
export interface RefreshToken {
    id: string;
    userId: string;
    jti: string;
    tokenHash: string;
    expiresAt: Date;
    revoked: boolean;
    createdAt: Date;
    updatedAt: Date;
}
