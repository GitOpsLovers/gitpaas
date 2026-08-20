import { User, UserRole } from '../../domain/models/user.models';

/**
 * A user as an answer of the API carries it.
 */
export interface UserResponse {
    id: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

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
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
    };
}
