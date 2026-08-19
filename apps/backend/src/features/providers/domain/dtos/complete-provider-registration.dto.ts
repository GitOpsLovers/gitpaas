import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Data transfer object for the end of the registration of a GitHub App
 */
export class CompleteProviderRegistrationDto {
    @IsString()
    @IsNotEmpty()
    public installationId!: string;
}
