import { DeploymentRunTask } from '../domain/models/deployment-run-task.models';
import { DockerExecutor } from '../domain/ports/docker-executor.port';
import { DeploymentsRepository } from '../domain/repositories/deployments.repository';

import { LogStore } from '@features/logs/domain/ports/log-store.port';
import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';
import { getProviderCredentialsUseCase } from '@features/source-control/application/get-provider-credentials.use-case';
import { ProviderCredentials } from '@features/source-control/domain/models/provider.models';
import { SourceControl } from '@features/source-control/domain/ports/source-control.port';
import { ProvidersRepository } from '@features/source-control/domain/repositories/providers.repository';

/**
 * Loads the credentials the provider of a deployed service gives to the source control.
 *
 * @param deploymentsRepository Deployments repository
 * @param servicesRepository Services repository
 * @param providersRepository Providers repository
 * @param deploymentId Deployment being run
 *
 * @returns Credentials of the provider of the service
 *
 * @throws ServiceNotFoundError When the deployment or its service no longer exists
 * @throws ProviderNotFoundError When the provider of the service no longer exists
 */
async function loadCredentials(
    deploymentsRepository: DeploymentsRepository,
    servicesRepository: ServicesRepository,
    providersRepository: ProvidersRepository,
    deploymentId: string,
): Promise<ProviderCredentials> {
    const deployment = await deploymentsRepository.findById(deploymentId);
    const service = deployment ? await servicesRepository.findById(deployment.serviceId) : null;

    if (!service) {
        throw new ServiceNotFoundError(deployment?.serviceId ?? deploymentId);
    }

    return getProviderCredentialsUseCase(providersRepository, service.providerId);
}

/**
 * Use case that runs a deployment.
 *
 * Marks the deployment's terminal status, loads the credentials of the provider of the
 * service, downloads the source archive, drives the docker run and fans each captured
 * line out to the logs store.
 *
 * @param deploymentsRepository Deployments repository
 * @param servicesRepository Services repository
 * @param providersRepository Providers repository
 * @param sourceControl Source control port
 * @param dockerExecutor Docker executor
 * @param logStore Logs store
 * @param payload Run payload
 */
export async function runDeploymentUseCase(
    deploymentsRepository: DeploymentsRepository,
    servicesRepository: ServicesRepository,
    providersRepository: ProvidersRepository,
    sourceControl: SourceControl,
    dockerExecutor: DockerExecutor,
    logStore: LogStore,
    payload: DeploymentRunTask,
): Promise<void> {
    await deploymentsRepository.update(payload.deploymentId, { status: 'running' });

    try {
        const credentials = await loadCredentials(
            deploymentsRepository,
            servicesRepository,
            providersRepository,
            payload.deploymentId,
        );

        const archive = await sourceControl.getRepositoryArchive(credentials, payload.repositoryId, payload.commit);

        await dockerExecutor.up(archive, payload.composerPath, payload.projectName, (line) => {
            logStore.append(payload.deploymentId, line).catch(() => undefined);
        });

        await deploymentsRepository.update(payload.deploymentId, { status: 'success' });
        await logStore.complete(payload.deploymentId, 'success');
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const failureLine = `✖ Deployment failed: ${message}`;

        await deploymentsRepository.update(payload.deploymentId, { status: 'failed', error: message });
        await logStore.append(payload.deploymentId, failureLine);
        await logStore.complete(payload.deploymentId, 'failed');
    }
}
