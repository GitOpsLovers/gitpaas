import { BadRequestException, NotFoundException } from '@nestjs/common';

import { CreateDeploymentDto } from '../domain/dtos/create-deployment.dto';
import { TriggerDeploymentDto } from '../domain/dtos/trigger-deployment.dto';
import { DockerExecutor } from '../domain/executors/docker.executor';
import { Deployment } from '../domain/models/deployment.model';
import { DeploymentsRepository } from '../domain/repositories/deployments.repository';

import { persistDeploymentUseCase } from './persist-deployment.use-case';
import { runDeploymentUseCase } from './run-deployment.use-case';

import { LogStoreRepository } from '@features/logs/domain/repositories/log-store.repository';
import { ProvidersRepository } from '@features/providers/domain/repositories/providers.repository';
import { Service } from '@features/services/domain/models/service.model';
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
 * record and fires the background run.
 *
 * @param deploymentsRepository Deployments repository
 * @param servicesRepository Services repository
 * @param providersRepository Providers repository
 * @param dockerExecutor Docker executor
 * @param logStore Log store used to buffer and fan out live output
 * @param triggerDto Data for triggering the deployment
 *
 * @returns The created deployment record
 */
export async function createDeploymentUseCase(
    deploymentsRepository: DeploymentsRepository,
    servicesRepository: ServicesRepository,
    providersRepository: ProvidersRepository,
    dockerExecutor: DockerExecutor,
    logStore: LogStoreRepository,
    triggerDto: TriggerDeploymentDto,
): Promise<Deployment> {
    const service = await servicesRepository.findById(triggerDto.serviceId);

    if (!service) {
        throw new NotFoundException(`Service ${triggerDto.serviceId} not found`);
    }

    if (!service.repositoryId || !service.deploymentBranch) {
        throw new BadRequestException('Service has no repository or deployment branch configured');
    }

    const commit = await providersRepository.getCommit(Number(service.repositoryId), service.deploymentBranch);

    const createDto: CreateDeploymentDto = {
        serviceId: service.id,
        branch: service.deploymentBranch,
        commit: commit.sha,
        // Store just the title (first line) of the commit message.
        commitMessage: commit.message.split('\n')[0],
        composerPath: service.composerPath,
        triggeredBy: 'system',
    };

    const deployment = await persistDeploymentUseCase(deploymentsRepository, createDto);

    // Fire-and-forget: the run drives the deployment forward in the background.
    runDeploymentUseCase(
        deploymentsRepository,
        providersRepository,
        dockerExecutor,
        logStore,
        {
            deploymentId: deployment.id,
            repositoryId: Number(service.repositoryId),
            commit: deployment.commit ?? deployment.branch,
            composerPath: deployment.composerPath,
            projectName: composeProjectName(service),
        },
    ).catch((error: unknown) => {
        // Last-resort safety net: runDeploymentUseCase handles its own failures,
        // so this only guards a truly unexpected throw.
        const message = error instanceof Error ? error.message : String(error);

        logStore.append(deployment.id, `✖ Deployment runner crashed: ${message}`);
        logStore.complete(deployment.id, 'failed');
    });

    return deployment;
}
