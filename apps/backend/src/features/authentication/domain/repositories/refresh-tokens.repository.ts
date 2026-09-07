import { CreateRefreshTokenDto } from '../dtos/create-refresh-token.dto';
import { RefreshToken } from '../models/refresh-token.models';

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
     * Revokes several refresh token records at once
     *
     * @param ids Refresh token record ids
     *
     * @returns Number of tokens revoked
     */
    revokeMany: (ids: string[]) => Promise<number>;

    /**
     * Revokes every refresh token of one family, which closes the whole chain that a single login opened
     *
     * @param familyId Family identifier
     *
     * @returns Number of tokens revoked
     */
    revokeFamily: (familyId: string) => Promise<number>;

    /**
     * Revokes every refresh token belonging to a user
     *
     * @param userId User id
     *
     * @returns Number of tokens revoked
     */
    revokeAllForUser: (userId: string) => Promise<number>;

    /**
     * Lists the live refresh tokens of a user, oldest first.
     *
     * @param userId User id
     *
     * @returns Live refresh token records, ordered by their creation
     */
    findActiveForUser: (userId: string) => Promise<RefreshToken[]>;
}
