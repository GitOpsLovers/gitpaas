/**
 * Role granted to a user, gating the actions it may perform.
 */
export enum UserRole {
    Admin = 'admin',
    User = 'user',
}

/**
 * An authenticated principal of the platform. Users are provisioned by an
 * administrator (or the seed script) — there is no public sign-up.
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
