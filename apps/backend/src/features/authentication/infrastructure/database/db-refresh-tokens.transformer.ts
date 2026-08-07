import { RefreshToken } from '../../domain/models/refresh-token.models';

import { DbRefreshTokenEntity } from './db-refresh-token.entity';

/**
 * Maps a refresh token database entity into its domain model.
 *
 * @param entity Refresh token database entity
 *
 * @returns Domain refresh token
 */
export function toRefreshToken(entity: DbRefreshTokenEntity): RefreshToken {
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
