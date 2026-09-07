/**
 * An authenticated principal of the platform.
 */
export interface User {
    id: string;
    email: string;
    passwordHash: string;
    displayName: string | null;
    totpSecret: string | null;
    totpEnabledAt: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
