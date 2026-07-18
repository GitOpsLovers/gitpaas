import { IsJWT, IsNotEmpty, IsString } from 'class-validator';

/**
 * Data transfer object carrying a refresh token, used by both the refresh and
 * logout endpoints.
 */
export class RefreshDto {
    @IsString()
    @IsNotEmpty()
    @IsJWT()
    public refreshToken!: string;
}
