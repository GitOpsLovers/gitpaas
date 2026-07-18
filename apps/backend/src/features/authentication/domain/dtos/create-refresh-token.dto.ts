import { IsDate, IsNotEmpty, IsString, IsUUID } from 'class-validator';

/**
 * Data transfer object for creating a refresh token
 */
export class CreateRefreshTokenDto {
    @IsUUID()
    @IsNotEmpty()
    public userId!: string;

    @IsString()
    @IsNotEmpty()
    public jti!: string;

    @IsString()
    @IsNotEmpty()
    public tokenHash!: string;

    @IsDate()
    public expiresAt!: Date;
}
