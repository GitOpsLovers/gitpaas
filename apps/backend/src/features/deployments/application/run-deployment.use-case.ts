import { ServiceNotDeployableError } from '../domain/errors/deployment.errors';
import { DeploymentRunTask } from '../domain/models/deployment-run-task.models';
import { DockerExecutor } from '../domain/ports/docker-executor.port';
import { DeploymentsRepository } from '../domain/repositories/deployments.repository';

import type { SecretCipher } from '@core/domain/ports/secret-cipher.port';
import { LogStore } from '@features/logs/domain/ports/log-store.port';
import { getProviderCredentialsUseCase } from '@features/providers/application/get-provider-credentials.use-case';
import { ProviderCredentials } from '@features/providers/domain/models/provider.models';
import { ProviderClient } from '@features/providers/domain/ports/provider-client.port';
import { ProvidersRepository } from '@features/providers/domain/repositories/providers.repository';
import { getServiceEnvironmentUseCase } from '@features/service-environment/application/get-service-environment.use-case';
import { ServiceVariablesRepository } from '@features/service-environment/domain/repositories/service-variables.repository';
import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

/**
 * Loads the service of a deployment, and the credentials its provider gives to the provider client.
 *
 * @param deploymentsRepository Deployments repository
 * @param servicesRepository Services repository
 * @param providersRepository Providers repository
 * @param deploymentId Deployment being run
 *
 * @returns Identifier of the service, and the credentials of its provider
 *
 * @throws ServiceNotFoundError When the deployment or its service no longer exists
 * @throws ServiceNotDeployableError When the service names no provider
 * @throws ProviderNotFoundError When the provider of the service no longer exists
 */
async function loadServiceContext(
    deploymentsRepository: DeploymentsRepository,
    servicesRepository: ServicesRepository,
    providersRepository: ProvidersRepository,
    deploymentId: string,
): Promise<{ serviceId: string; credentials: ProviderCredentials }> {
    const deployment = await deploymentsRepository.findById(deploymentId);
    const service = deployment ? await servicesRepository.findById(deployment.serviceId) : null;

    if (!service) {
        throw new ServiceNotFoundError(deployment?.serviceId ?? deploymentId);
    }

    if (!service.providerId) {
        throw new ServiceNotDeployableError();
    }

    const credentials = await getProviderCredentialsUseCase(providersRepository, service.providerId);

    return { serviceId: service.id, credentials };
}

/**
 * Use case that runs a deployment.
 *
 * @param deploymentsRepository Deployments repository
 * @param servicesRepository Services repository
 * @param providersRepository Providers repository
 * @param serviceVariablesRepository Service variables repository
 * @param providerClient Provider client port
 * @param dockerExecutor Docker executor
 * @param logStore Logs store
 * @param secretCipher Secret cipher, which opens the secrets of the service
 * @param payload Run payload
 */
export async function runDeploymentUseCase(
    deploymentsRepository: DeploymentsRepository,
    servicesRepository: ServicesRepository,
    providersRepository: ProvidersRepository,
    serviceVariablesRepository: ServiceVariablesRepository,
    providerClient: ProviderClient,
    dockerExecutor: DockerExecutor,
    logStore: LogStore,
    secretCipher: SecretCipher,
    payload: DeploymentRunTask,
): Promise<void> {
    await deploymentsRepository.update(payload.deploymentId, { status: 'running' });

    try {
        const { serviceId, credentials } = await loadServiceContext(
            deploymentsRepository,
            servicesRepository,
            providersRepository,
            payload.deploymentId,
        );

        const archive = await providerClient.getRepositoryArchive(credentials, payload.repositoryId, payload.commit);
        const environment = await getServiceEnvironmentUseCase(serviceVariablesRepository, secretCipher, serviceId);

        await dockerExecutor.up(archive, payload.composerPath, payload.projectName, environment, (line) => {
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
