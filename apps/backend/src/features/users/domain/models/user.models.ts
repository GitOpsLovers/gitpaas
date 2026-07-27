/**
 * Role granted to a user, gating the actions it may perform.
 */
export enum UserRole {
    Admin = 'admin',
    User = 'user',
}

/**
 * An authenticated principal of the platform.
 */
export interface User {
    id: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
