import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Data transfer object for creating a new project
 */
export class CreateProjectDto {
    @IsString()
    @IsNotEmpty()
    public name!: string;
}
