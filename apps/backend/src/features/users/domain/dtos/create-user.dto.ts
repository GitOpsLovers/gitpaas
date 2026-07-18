import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { UserRole } from '../models/user.model';

/**
 * Data transfer object for creating a user
 */
export class CreateUserDto {
    @IsEmail()
    @IsNotEmpty()
    public email!: string;

    @IsString()
    @IsNotEmpty()
    public passwordHash!: string;

    @IsEnum(UserRole)
    @IsOptional()
    public role?: UserRole;

    @IsBoolean()
    @IsOptional()
    public isActive?: boolean;
}
