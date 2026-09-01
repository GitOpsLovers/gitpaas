import {
    AccessTokenPayload,
    IssuedRefreshToken,
    RefreshTokenPayload,
    TwoFactorChallengePayload,
} from '../models/token-payloads.models';

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

    /**
     * Signs the short-lived token that stands between the two steps of a login
     *
     * @param userId Identifier of the account the second step must name
     *
     * @returns Signed challenge token
     */
    signTwoFactorChallenge: (userId: string) => string;

    /**
     * Verifies the signature, the expiry and the purpose of a challenge token
     *
     * @param token Signed challenge token
     *
     * @returns Decoded challenge claims
     *
     * @throws When the token is malformed, tampered with, expired, or not a challenge
     */
    verifyTwoFactorChallenge: (token: string) => TwoFactorChallengePayload;
}
