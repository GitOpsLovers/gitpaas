/**
 * Data transfer object for creating a refresh token
 */
export interface CreateRefreshTokenDto {
    userId: string;
    jti: string;
    tokenHash: string;
    expiresAt: Date;
}
