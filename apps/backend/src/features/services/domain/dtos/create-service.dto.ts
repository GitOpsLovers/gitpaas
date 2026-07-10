import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

/**
 * Data transfer object for creating a new service
 */
export class CreateServiceDto {
    @IsString()
    @IsNotEmpty()
    public name!: string;

    @IsUUID()
    @IsNotEmpty()
    public projectId!: string;
}
