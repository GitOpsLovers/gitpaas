import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Data transfer object for removing an image
 */
export class RemoveImageDto {
    @IsOptional()
    @IsBoolean()
    public force?: boolean;
}
