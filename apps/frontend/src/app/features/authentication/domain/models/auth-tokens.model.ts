/**
 * Pair of tokens issued by the backend on a successful authentication.
 *
 * The access token authorises API calls (sent as a Bearer header); the refresh
 * token is exchanged for a new pair when the access token expires.
 */
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}
