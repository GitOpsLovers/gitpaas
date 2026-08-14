import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Data transfer object for creating a new namespace
 */
export class CreateNamespaceDto {
    @IsString()
    @IsNotEmpty()
    public name!: string;
}
