import { CreateDeploymentDto } from '../domain/dtos/create-deployment.dto';
import { TriggerDeploymentDto } from '../domain/dtos/trigger-deployment.dto';
import { ServiceNotDeployableError, ServiceNotFoundError } from '../domain/errors/deployment.errors';
import { Deployment } from '../domain/models/deployment.models';
import { DeploymentQueue } from '../domain/ports/deployment-queue.port';
import { DeploymentsRepository } from '../domain/repositories/deployments.repository';

import { persistDeploymentUseCase } from './persist-deployment.use-case';

import { Providers } from '@features/providers/domain/ports/providers.port';
import { Service } from '@features/services/domain/models/service.models';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

/**
 * Builds the Docker Compose project name for a service from its name, falling
 * back to its id. This value groups all of the service's Docker resources under
 * the `com.docker.compose.project` label.
 *
 * @param service Service to derive the project name from
 *
 * @returns Compose project name
 */
function composeProjectName(service: Service): string {
    const slug = service.name.toLowerCase().replace(/[^\da-z]+/g, '-').replace(/^-+|-+$/g, '');

    return slug || `service-${service.id}`;
}

/**
 * Use case that orchestrates triggering a new deployment for a service:
 * validates the service, resolves the head commit, persists the deployment
 * record and publishes a run request on the deployment queue. The deployment
 * feature's own background runner consumes that request and executes the run
 * (docker + status + log stream), so the request returns the record immediately.
 *
 * @param deploymentsRepository Deployments repository
 * @param servicesRepository Services repository
 * @param providersRepository Providers repository
 * @param queue Deployment queue the run request is enqueued on
 * @param triggerDto Data for triggering the deployment
 *
 * @returns The created deployment record
 */
export async function createDeploymentUseCase(
    deploymentsRepository: DeploymentsRepository,
    servicesRepository: ServicesRepository,
    providersRepository: Providers,
    queue: DeploymentQueue,
    triggerDto: TriggerDeploymentDto,
): Promise<Deployment> {
    const service = await servicesRepository.findById(triggerDto.serviceId);

    if (!service) {
        throw new ServiceNotFoundError(triggerDto.serviceId);
    }

    if (!service.repositoryId || !service.deploymentBranch) {
        throw new ServiceNotDeployableError();
    }

    const commit = await providersRepository.getCommit(Number(service.repositoryId), service.deploymentBranch);

    const createDto: CreateDeploymentDto = {
        serviceId: service.id,
        branch: service.deploymentBranch,
        commit: commit.sha,
        commitMessage: commit.message.split('\n')[0],
        composerPath: service.composerPath,
        triggeredBy: 'system',
    };

    const deployment = await persistDeploymentUseCase(deploymentsRepository, createDto);

    await queue.enqueue({
        deploymentId: deployment.id,
        repositoryId: Number(service.repositoryId),
        commit: deployment.commit ?? deployment.branch,
        composerPath: deployment.composerPath,
        projectName: composeProjectName(service),
    });

    return deployment;
}
