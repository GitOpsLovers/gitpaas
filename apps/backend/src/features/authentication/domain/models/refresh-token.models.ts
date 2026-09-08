/**
 * A persisted, revocable refresh token.
 */
export interface RefreshToken {
    id: string;
    userId: string;
    jti: string;
    familyId: string;
    tokenHash: string;
    expiresAt: Date;
    revoked: boolean;
    createdAt: Date;
    updatedAt: Date;
}
