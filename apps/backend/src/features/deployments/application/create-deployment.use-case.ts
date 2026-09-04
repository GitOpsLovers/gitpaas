import type { TriggerDeploymentDto } from '@gitpaas/contracts';

import { CreateDeploymentDto } from '../domain/dtos/create-deployment.dto';
import { ProviderRepositoryUnreachableError, ServiceNotDeployableError } from '../domain/errors/deployment.errors';
import { Deployment } from '../domain/models/deployment.models';
import { DeploymentQueue } from '../domain/ports/deployment-queue.port';
import { DeploymentsRepository } from '../domain/repositories/deployments.repository';

import { persistDeploymentUseCase } from './persist-deployment.use-case';

import { getProviderCredentialsUseCase } from '@features/providers/application/get-provider-credentials.use-case';
import { ProviderResourceNotFoundError } from '@features/providers/domain/errors/provider-client.errors';
import { GitCommit } from '@features/providers/domain/models/git-commit.models';
import { ProviderCredentials } from '@features/providers/domain/models/provider.models';
import { ProviderClient } from '@features/providers/domain/ports/provider-client.port';
import { ProvidersRepository } from '@features/providers/domain/repositories/providers.repository';
import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

/**
 * Resolves the head commit of the deployment branch, with the credentials of the provider.
 *
 * @param providerClient Provider client port
 * @param credentials Credentials of the provider of the service
 * @param repositoryId Repository the service stores
 * @param ref Branch to resolve
 *
 * @returns The resolved commit, with its SHA and message
 *
 * @throws ProviderRepositoryUnreachableError When the provider cannot reach the repository
 */
async function resolveHeadCommit(
    providerClient: ProviderClient,
    credentials: ProviderCredentials,
    repositoryId: string,
    ref: string,
): Promise<GitCommit> {
    try {
        return await providerClient.getCommit(credentials, Number(repositoryId), ref);
    } catch (error) {
        if (error instanceof ProviderResourceNotFoundError) {
            throw new ProviderRepositoryUnreachableError(credentials.providerId, repositoryId, { cause: error });
        }

        throw error;
    }
}

/**
 * Use case that orchestrates triggering a new deployment for a service.
 *
 * Validates the service, loads the credentials of its provider, resolves the head
 * commit, persists the deployment record and publishes a run request on the
 * deployment queue.
 *
 * @param deploymentsRepository Deployments repository
 * @param servicesRepository Services repository
 * @param providersRepository Providers repository
 * @param providerClient Provider client port
 * @param deploymentQueue Deployment queue
 * @param triggerDto Data for triggering the deployment
 *
 * @returns The created deployment record
 */
export async function createDeploymentUseCase(
    deploymentsRepository: DeploymentsRepository,
    servicesRepository: ServicesRepository,
    providersRepository: ProvidersRepository,
    providerClient: ProviderClient,
    deploymentQueue: DeploymentQueue,
    triggerDto: TriggerDeploymentDto,
): Promise<Deployment> {
    const service = await servicesRepository.findById(triggerDto.serviceId);

    if (!service) {
        throw new ServiceNotFoundError(triggerDto.serviceId);
    }

    if (!service.providerId || !service.repositoryId || !service.deploymentBranch) {
        throw new ServiceNotDeployableError();
    }

    const credentials = await getProviderCredentialsUseCase(providersRepository, service.providerId);

    const commit = await resolveHeadCommit(
        providerClient,
        credentials,
        service.repositoryId,
        service.deploymentBranch,
    );

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
        serviceId: service.id,
        repositoryId: Number(service.repositoryId),
        commit: deployment.commit ?? deployment.branch,
        composerPath: deployment.composerPath,
        projectName: service.composeProject,
    });

    return deployment;
}
