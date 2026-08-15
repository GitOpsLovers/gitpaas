import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { ProviderType } from '../models/provider.models';

/**
 * Data transfer object for changing an existing provider
 *
 * Every field is optional. An absent or empty `privateKey` keeps the stored key,
 * so an operator changes the name of a provider without the PEM at hand.
 */
export class UpdateProviderDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    public name?: string;

    @IsOptional()
    @IsEnum(ProviderType)
    public type?: ProviderType;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    public appId?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    public installationId?: string;

    @IsOptional()
    @IsString()
    public privateKey?: string;
}
