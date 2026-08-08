import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Data transfer object for removing a container
 */
export class RemoveContainerDto {
    @IsOptional()
    @IsBoolean()
    public force?: boolean;

    @IsOptional()
    @IsBoolean()
    public removeVolumes?: boolean;
}
