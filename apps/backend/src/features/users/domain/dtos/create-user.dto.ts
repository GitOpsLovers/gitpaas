import type { UserRole } from '../models/user.models';

/**
 * Data transfer object for creating a user
 */
export interface CreateUserDto {
    email: string;
    passwordHash: string;
    role?: UserRole;
    isActive?: boolean;
}
