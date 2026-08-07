import { User } from '../../domain/models/user.models';

import { DbUserEntity } from './db-user.entity';

/**
 * Maps a user database entity into its domain model.
 *
 * @param entity User database entity
 *
 * @returns Domain user
 */
export function toUser(entity: DbUserEntity): User {
    return {
        id: entity.id,
        email: entity.email,
        passwordHash: entity.passwordHash,
        role: entity.role,
        isActive: entity.isActive,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
    };
}
