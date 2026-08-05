import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * Data transfer object for seeding an administrative user
 */
export class SeedAdminDto {
    @IsEmail()
    @IsNotEmpty()
    public email!: string;

    @IsString()
    @IsNotEmpty()
    public password!: string;
}
