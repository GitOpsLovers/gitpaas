import { User } from '../../domain/models/user.model';

import { UserDbEntity } from './user-db.entity';

/**
 * Maps a user database entity into its domain model.
 *
 * @param entity User database entity
 *
 * @returns Domain user
 */
export function toUser(entity: UserDbEntity): User {
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
