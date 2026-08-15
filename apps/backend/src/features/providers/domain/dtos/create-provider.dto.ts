import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { ProviderType } from '../models/provider.models';

/**
 * Data transfer object for registering a new provider
 */
export class CreateProviderDto {
    @IsString()
    @IsNotEmpty()
    public name!: string;

    @IsOptional()
    @IsEnum(ProviderType)
    public type?: ProviderType;

    @IsString()
    @IsNotEmpty()
    public appId!: string;

    @IsString()
    @IsNotEmpty()
    public installationId!: string;

    @IsString()
    @IsNotEmpty()
    public privateKey!: string;
}
