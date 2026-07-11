import { IsNotEmpty, IsUUID } from 'class-validator';

/**
 * Data transfer object for triggering a deployment
 */
export class TriggerDeploymentDto {
    @IsUUID()
    @IsNotEmpty()
    public serviceId!: string;
}
