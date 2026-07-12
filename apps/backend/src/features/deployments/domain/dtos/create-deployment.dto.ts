import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

/**
 * Data transfer object for create a new deployment.
 */
export class CreateDeploymentDto {
    @IsUUID()
    @IsNotEmpty()
    public serviceId!: string;

    @IsString()
    @IsNotEmpty()
    public branch!: string;

    @IsString()
    @IsNotEmpty()
    public commit!: string;

    @IsString()
    @IsNotEmpty()
    public commitMessage!: string;

    @IsString()
    @IsNotEmpty()
    public composerPath!: string;

    @IsString()
    @IsNotEmpty()
    public triggeredBy!: string;
}
