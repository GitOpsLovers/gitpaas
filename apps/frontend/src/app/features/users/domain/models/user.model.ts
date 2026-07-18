/**
 * Role granted to a user, gating the actions it may perform.
 */
export type UserRole = 'admin' | 'user';

/**
 * Domain model representing a user of the application.
 *
 * Matches the backend user shape without its `passwordHash`. Timestamps
 * arrive as ISO strings over the wire.
 */
export interface User {
    id: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
