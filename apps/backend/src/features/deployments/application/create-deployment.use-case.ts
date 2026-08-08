import { CreateDeploymentDto } from '../domain/dtos/create-deployment.dto';
import { TriggerDeploymentDto } from '../domain/dtos/trigger-deployment.dto';
import { ServiceNotDeployableError, ServiceNotFoundError } from '../domain/errors/deployment.errors';
import { Deployment } from '../domain/models/deployment.models';
import { DeploymentQueue } from '../domain/ports/deployment-queue.port';
import { DeploymentsRepository } from '../domain/repositories/deployments.repository';

import { persistDeploymentUseCase } from './persist-deployment.use-case';

import { Providers } from '@features/providers/domain/ports/providers.port';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';
import { getServiceSlug } from '@shared/application/get-service-slug.use-case';

/**
 * Use case that orchestrates triggering a new deployment for a service.
 *
 * Validates the service, resolves the head commit, persists the deployment
 * record and publishes a run request on the deployment queue.
 *
 * @param deploymentsRepository Deployments repository
 * @param servicesRepository Services repository
 * @param providers Providers
 * @param deploymentQueue Deployment queue
 * @param triggerDto Data for triggering the deployment
 *
 * @returns The created deployment record
 */
export async function createDeploymentUseCase(
    deploymentsRepository: DeploymentsRepository,
    servicesRepository: ServicesRepository,
    providers: Providers,
    deploymentQueue: DeploymentQueue,
    triggerDto: TriggerDeploymentDto,
): Promise<Deployment> {
    const service = await servicesRepository.findById(triggerDto.serviceId);

    if (!service) {
        throw new ServiceNotFoundError(triggerDto.serviceId);
    }

    if (!service.repositoryId || !service.deploymentBranch) {
        throw new ServiceNotDeployableError();
    }

    const commit = await providers.getCommit(Number(service.repositoryId), service.deploymentBranch);

    const createDto: CreateDeploymentDto = {
        serviceId: service.id,
        branch: service.deploymentBranch,
        commit: commit.sha,
        commitMessage: commit.message.split('\n')[0],
        composerPath: service.composerPath,
        triggeredBy: 'system',
    };

    const deployment = await persistDeploymentUseCase(deploymentsRepository, createDto);

    await deploymentQueue.enqueue({
        deploymentId: deployment.id,
        repositoryId: Number(service.repositoryId),
        commit: deployment.commit ?? deployment.branch,
        composerPath: deployment.composerPath,
        projectName: getServiceSlug(service),
    });

    return deployment;
}
