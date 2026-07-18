import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * Data transfer object for logging in with email and password
 */
export class LoginDto {
    @IsEmail()
    @IsNotEmpty()
    public email!: string;

    @IsString()
    @IsNotEmpty()
    public password!: string;
}
