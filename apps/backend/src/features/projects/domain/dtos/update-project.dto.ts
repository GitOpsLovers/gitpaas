import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Data transfer object for update an existing project
 */
export class UpdateProjectDto {
    @IsString()
    @IsNotEmpty()
    public name!: string;
}
