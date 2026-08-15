import { CreateDeploymentDto } from '../domain/dtos/create-deployment.dto';
import { TriggerDeploymentDto } from '../domain/dtos/trigger-deployment.dto';
import { ProviderRepositoryUnreachableError, ServiceNotDeployableError } from '../domain/errors/deployment.errors';
import { Deployment } from '../domain/models/deployment.models';
import { DeploymentQueue } from '../domain/ports/deployment-queue.port';
import { DeploymentsRepository } from '../domain/repositories/deployments.repository';

import { persistDeploymentUseCase } from './persist-deployment.use-case';

import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';
import { getProviderCredentialsUseCase } from '@features/source-control/application/get-provider-credentials.use-case';
import { SourceControlResourceNotFoundError } from '@features/source-control/domain/errors/source-control.errors';
import { GitCommit } from '@features/source-control/domain/models/git-commit.models';
import { ProviderCredentials } from '@features/source-control/domain/models/provider.models';
import { SourceControl } from '@features/source-control/domain/ports/source-control.port';
import { ProvidersRepository } from '@features/source-control/domain/repositories/providers.repository';
import { getServiceSlug } from '@shared/application/get-service-slug.use-case';

/**
 * Resolves the head commit of the deployment branch, with the credentials of the provider.
 *
 * @param sourceControl Source control port
 * @param credentials Credentials of the provider of the service
 * @param repositoryId Repository the service stores
 * @param ref Branch to resolve
 *
 * @returns The resolved commit, with its SHA and message
 *
 * @throws ProviderRepositoryUnreachableError When the provider cannot reach the repository
 */
async function resolveHeadCommit(
    sourceControl: SourceControl,
    credentials: ProviderCredentials,
    repositoryId: string,
    ref: string,
): Promise<GitCommit> {
    try {
        return await sourceControl.getCommit(credentials, Number(repositoryId), ref);
    } catch (error) {
        if (error instanceof SourceControlResourceNotFoundError) {
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
 * @param sourceControl Source control port
 * @param deploymentQueue Deployment queue
 * @param triggerDto Data for triggering the deployment
 *
 * @returns The created deployment record
 */
export async function createDeploymentUseCase(
    deploymentsRepository: DeploymentsRepository,
    servicesRepository: ServicesRepository,
    providersRepository: ProvidersRepository,
    sourceControl: SourceControl,
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

    const credentials = await getProviderCredentialsUseCase(providersRepository, service.providerId);

    const commit = await resolveHeadCommit(
        sourceControl,
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
        repositoryId: Number(service.repositoryId),
        commit: deployment.commit ?? deployment.branch,
        composerPath: deployment.composerPath,
        projectName: getServiceSlug(service),
    });

    return deployment;
}
