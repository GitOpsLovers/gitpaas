import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

/**
 * Data transfer object for creating a new project inside a namespace
 */
export class CreateProjectInNamespaceDto {
    @IsString()
    @IsNotEmpty()
    public name!: string;

    @IsUUID()
    @IsNotEmpty()
    public namespaceId!: string;
}
