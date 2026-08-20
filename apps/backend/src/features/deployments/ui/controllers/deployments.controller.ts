import {
    // eslint-disable-next-line @typescript-eslint/no-redeclare
    Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Post, Query,
} from '@nestjs/common';

import { TriggerDeploymentDto } from '../../domain/dtos/trigger-deployment.dto';
import { DeploymentsService } from '../services/deployments.service';
import { DeploymentResponse, toDeploymentResponse } from '../transformers/deployment-response.transformer';

import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { translateError } from '@core/ui/translators/http-error.translator';

/**
 * Deployments controller
 */
@Controller('deployments')
export class DeploymentsController {
    constructor(private readonly service: DeploymentsService) {}

    /**
     * Get every deployment belonging to a service
     *
     * @param serviceId Service identifier
     *
     * @returns List of deployments for the service
     */
    @Get()
    public async getAllByService(@Query('serviceId', ParseUUIDPipe) serviceId: string): Promise<DeploymentResponse[]> {
        enrichTelemetry({ 'service.id': serviceId });

        const deployments = await this.service.getAllByService(serviceId);

        return deployments.map(toDeploymentResponse);
    }

    /**
     * Find a single deployment by its identifier
     *
     * @param id Deployment identifier
     *
     * @returns Deployment record
     */
    @Get(':id')
    public async findById(@Param('id', ParseUUIDPipe) id: string): Promise<DeploymentResponse> {
        enrichTelemetry({ 'deployment.id': id });

        const deployment = await this.service.findById(id);

        if (!deployment) {
            throw new NotFoundException(`Deployment ${id} not found`);
        }

        return toDeploymentResponse(deployment);
    }

    /**
     * Trigger a new deployment for a service
     *
     * @param triggerDto Data for triggering the deployment
     *
     * @returns The created deployment record
     */
    @Post()
    public async create(@Body() triggerDto: TriggerDeploymentDto): Promise<DeploymentResponse> {
        enrichTelemetry({ 'service.id': triggerDto.serviceId });

        try {
            const deployment = await this.service.create(triggerDto);

            return toDeploymentResponse(deployment);
        } catch (error) {
            throw translateError(error);
        }
    }

    /**
     * Delete a deployment record
     *
     * @param id Deployment identifier
     */
    @Delete(':id')
    @HttpCode(204)
    public async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        enrichTelemetry({ 'deployment.id': id });

        const deleted = await this.service.delete(id);

        if (!deleted) {
            throw new NotFoundException(`Deployment ${id} not found`);
        }
    }
}
