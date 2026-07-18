import { CreateRefreshTokenDto } from '../dtos/create-refresh-token.dto';
import { RefreshToken } from '../models/refresh-token.model';

/**
 * Refresh tokens repository
 */
export interface RefreshTokensRepository {
    /**
     * Persists a freshly issued refresh token
     *
     * @param input Refresh token data (with an already-hashed token)
     *
     * @returns Created refresh token record
     */
    create: (input: CreateRefreshTokenDto) => Promise<RefreshToken>;

    /**
     * Finds a single refresh token record by its `jti` claim
     *
     * @param jti Token identifier
     *
     * @returns Refresh token record, or `null` when it does not exist
     */
    findByJti: (jti: string) => Promise<RefreshToken | null>;

    /**
     * Revokes a single refresh token record
     *
     * @param id Refresh token record id
     *
     * @returns `true` when a row was revoked, `false` otherwise
     */
    revoke: (id: string) => Promise<boolean>;

    /**
     * Revokes every refresh token belonging to a user
     *
     * @param userId User id
     *
     * @returns Number of tokens revoked
     */
    revokeAllForUser: (userId: string) => Promise<number>;
}
