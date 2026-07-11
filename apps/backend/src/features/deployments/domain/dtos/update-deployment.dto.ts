import { IsIn, IsOptional, IsString } from 'class-validator';

import type { DeploymentStatus } from '../models/deployment.model';

/**
 * Allowed deployment statuses, used to validate the update DTO.
 */
const DEPLOYMENT_STATUSES: DeploymentStatus[] = ['pending', 'running', 'success', 'failed'];

/**
 * Data transfer object for updating a deployment's status.
 */
export class UpdateDeploymentDto {
    @IsIn(DEPLOYMENT_STATUSES)
    public status!: DeploymentStatus;

    @IsOptional()
    @IsString()
    public error?: string | null;
}
