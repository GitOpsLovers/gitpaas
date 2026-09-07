/**
 * Data transfer object for creating a user
 */
export interface CreateUserDto {
    email: string;
    passwordHash: string;
    isActive?: boolean;
}
