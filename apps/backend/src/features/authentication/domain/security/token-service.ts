import { AccessTokenPayload, IssuedRefreshToken, RefreshTokenPayload } from '../models/token.model';

/**
 * Token signing/verification port.
 */
export interface TokenService {
    /**
     * Signs a short-lived access token
     *
     * @param payload Access token claims
     *
     * @returns Signed access token
     */
    signAccessToken: (payload: AccessTokenPayload) => string;

    /**
     * Mints a long-lived refresh token together with the metadata needed to
     * persist its revocable record
     *
     * @param payload Subject the refresh token is issued for
     *
     * @returns Signed refresh token, its `jti`, its hash and its expiry
     */
    issueRefreshToken: (payload: AccessTokenPayload) => IssuedRefreshToken;

    /**
     * Verifies a refresh token's signature and expiry
     *
     * @param token Signed refresh token
     *
     * @returns Decoded refresh token claims
     *
     * @throws When the token is malformed, tampered with or expired
     */
    verifyRefreshToken: (token: string) => RefreshTokenPayload;

    /**
     * Computes the stored hash of a refresh token, for constant-time comparison
     * against the persisted record
     *
     * @param token Signed refresh token
     *
     * @returns Deterministic token hash
     */
    hashRefreshToken: (token: string) => string;
}
