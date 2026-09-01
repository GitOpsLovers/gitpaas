import type { User as UserResponse } from '@gitpaas/contracts';

import { User } from '../../domain/models/user.models';

/**
 * Maps a domain user into the shape an answer of the API carries.
 *
 * @param user Domain user, with or without its hash of the password
 *
 * @returns User of the wire
 */
export function toUserResponse(user: Omit<User, 'passwordHash'>): UserResponse {
    return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        totpEnabled: user.totpEnabledAt !== null,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
    };
}
