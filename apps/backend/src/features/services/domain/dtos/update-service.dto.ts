import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Data transfer object for updating an existing service
 */
export class UpdateServiceDto {
    @IsString()
    @IsNotEmpty()
    public name!: string;
}
