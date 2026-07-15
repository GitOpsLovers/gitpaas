import {
    Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Post, Query,
} from '@nestjs/common';

import { TriggerDeploymentDto } from '../../domain/dtos/trigger-deployment.dto';
import { Deployment } from '../../domain/models/deployment.model';
import { DeploymentsService } from '../services/deployments.service';

/**
 * Deployments controller
 */
@Controller('deployments')
export class DeploymentsController {
    constructor(private readonly service: DeploymentsService) {}

    /**
     * Get every deployment belonging to a service, most recent first
     *
     * @param serviceId Service identifier
     *
     * @returns List of deployments for the service
     */
    @Get()
    public getAllByService(@Query('serviceId', ParseUUIDPipe) serviceId: string): Promise<Deployment[]> {
        return this.service.getAllByService(serviceId);
    }

    /**
     * Find a single deployment by its identifier
     *
     * @param id Deployment identifier
     *
     * @returns Deployment record, or `null` if not found
     */
    @Get(':id')
    public async findById(@Param('id', ParseUUIDPipe) id: string): Promise<Deployment> {
        const deployment = await this.service.findById(id);

        if (!deployment) {
            throw new NotFoundException(`Deployment ${id} not found`);
        }

        return deployment;
    }

    /**
     * Trigger a new deployment for a service
     *
     * @param triggerDto Data for triggering the deployment
     *
     * @returns The created deployment record
     */
    @Post()
    public create(@Body() triggerDto: TriggerDeploymentDto): Promise<Deployment> {
        return this.service.create(triggerDto);
    }

    /**
     * Delete a deployment record
     *
     * @param id Deployment identifier
     */
    @Delete(':id')
    @HttpCode(204)
    public async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        const deleted = await this.service.delete(id);

        if (!deleted) {
            throw new NotFoundException(`Deployment ${id} not found`);
        }
    }
}
