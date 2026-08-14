import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Data transfer object for update an existing namespace
 */
export class UpdateNamespaceDto {
    @IsString()
    @IsNotEmpty()
    public name!: string;
}
