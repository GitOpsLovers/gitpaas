import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Data transfer object for the conversion of the temporary code of a manifest
 */
export class ConvertProviderRegistrationDto {
    @IsString()
    @IsNotEmpty()
    public code!: string;
}
