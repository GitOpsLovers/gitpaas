import { IsEnum, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

import { ProviderAppOwnerType } from '../models/provider-registration.models';

/**
 * Data transfer object for starting the registration of a GitHub App the platform creates
 */
export class StartProviderRegistrationDto {
    @IsString()
    @IsNotEmpty()
    public name!: string;

    @IsEnum(ProviderAppOwnerType)
    public ownerType!: ProviderAppOwnerType;

    @ValidateIf((dto: StartProviderRegistrationDto) => dto.ownerType === ProviderAppOwnerType.Organization)
    @IsString()
    @IsNotEmpty()
    public ownerLogin?: string;
}
