import { triggerDeploymentSchema } from '@gitpaas/contracts';
import type { Deployment as DeploymentResponse, TriggerDeploymentDto } from '@gitpaas/contracts';
import {
    // eslint-disable-next-line @typescript-eslint/no-redeclare
    Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Post, Query,
} from '@nestjs/common';

import { DeploymentsService } from '../services/deployments.service';
import { toDeploymentResponse } from '../transformers/deployment-response.transformer';

import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { ZodValidationPipe } from '@core/ui/pipes/zod-validation.pipe';
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
     * List the compose services the last deployment of a service declares
     *
     * @param serviceId Service identifier
     *
     * @returns The names of the compose services of the recipe
     */
    @Get('compose-services')
    public async getComposeServices(@Query('serviceId', ParseUUIDPipe) serviceId: string): Promise<string[]> {
        enrichTelemetry({ 'service.id': serviceId });

        try {
            return await this.service.getComposeServices(serviceId);
        } catch (error) {
            throw translateError(error);
        }
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
    public async create(@Body(new ZodValidationPipe(triggerDeploymentSchema)) triggerDto: TriggerDeploymentDto): Promise<DeploymentResponse> {
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
