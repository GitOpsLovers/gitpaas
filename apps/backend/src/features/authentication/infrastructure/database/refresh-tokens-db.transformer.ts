import { RefreshToken } from '../../domain/models/refresh-token.model';

import { RefreshTokenDbEntity } from './refresh-token-db.entity';

/**
 * Maps a refresh token database entity into its domain model.
 *
 * @param entity Refresh token database entity
 *
 * @returns Domain refresh token
 */
export function toRefreshToken(entity: RefreshTokenDbEntity): RefreshToken {
    return {
        id: entity.id,
        userId: entity.userId,
        jti: entity.jti,
        tokenHash: entity.tokenHash,
        expiresAt: entity.expiresAt,
        revoked: entity.revoked,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
    };
}
