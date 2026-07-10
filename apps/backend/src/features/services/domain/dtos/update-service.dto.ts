import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Data transfer object for updating an existing service
 */
export class UpdateServiceDto {
    @IsString()
    @IsNotEmpty()
    public name!: string;

    @IsOptional()
    @IsString()
    public repositoryId?: string;

    @IsOptional()
    @IsString()
    public deploymentBranch?: string;

    @IsOptional()
    @IsString()
    public composerPath?: string;
}
