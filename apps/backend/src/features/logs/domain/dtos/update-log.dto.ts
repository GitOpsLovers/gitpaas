import { IsOptional, IsString } from 'class-validator';

/**
 * Data transfer object for updating a log entry's content.
 */
export class UpdateLogDto {
    @IsOptional()
    @IsString()
    public content?: string | null;
}
