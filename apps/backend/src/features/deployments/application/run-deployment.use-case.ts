import { ServiceNotDeployableError } from '../domain/errors/deployment.errors';
import { DeploymentRunTask } from '../domain/models/deployment-run-task.models';
import { DeploymentTarget, DockerExecutor } from '../domain/ports/docker-executor.port';
import { DeploymentsRepository } from '../domain/repositories/deployments.repository';

import type { SecretCipher } from '@core/domain/ports/secret-cipher.port';
import { ReverseProxy } from '@features/domains/domain/ports/reverse-proxy.port';
import { DomainsRepository } from '@features/domains/domain/repositories/domains.repository';
import { LogStore } from '@features/logs/domain/ports/log-store.port';
import { ServiceNetworksRepository } from '@features/networks/domain/repositories/service-networks.repository';
import { getProviderCredentialsUseCase } from '@features/providers/application/get-provider-credentials.use-case';
import { ProviderCredentials } from '@features/providers/domain/models/provider.models';
import { ProviderClient } from '@features/providers/domain/ports/provider-client.port';
import { ProvidersRepository } from '@features/providers/domain/repositories/providers.repository';
import { getServiceEnvironmentUseCase } from '@features/service-environment/application/get-service-environment.use-case';
import { ServiceVariablesRepository } from '@features/service-environment/domain/repositories/service-variables.repository';
import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { Service } from '@features/services/domain/models/service.models';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';
import { adoptComposeVolumesUseCase } from '@features/volumes/application/adopt-compose-volumes.use-case';
import { DaemonVolumesRepository } from '@features/volumes/domain/repositories/daemon-volumes.repository';
import { VolumesRepository } from '@features/volumes/domain/repositories/volumes.repository';
import { getServiceSlug } from '@shared/application/get-service-slug.use-case';

/**
 * Loads the service of a deployment, and the credentials its provider gives to the provider client.
 *
 * @param deploymentsRepository Deployments repository
 * @param servicesRepository Services repository
 * @param providersRepository Providers repository
 * @param deploymentId Deployment being run
 *
 * @returns The service of the deployment, and the credentials of its provider
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
): Promise<{ service: Service; credentials: ProviderCredentials }> {
    const deployment = await deploymentsRepository.findById(deploymentId);
    const service = deployment ? await servicesRepository.findById(deployment.serviceId) : null;

    if (!service) {
        throw new ServiceNotFoundError(deployment?.serviceId ?? deploymentId);
    }

    if (!service.providerId) {
        throw new ServiceNotDeployableError();
    }

    const credentials = await getProviderCredentialsUseCase(providersRepository, service.providerId);

    return { service, credentials };
}

/**
 * Use case that runs a deployment.
 *
 * @param deploymentsRepository Deployments repository
 * @param servicesRepository Services repository
 * @param providersRepository Providers repository
 * @param serviceVariablesRepository Service variables repository
 * @param domainsRepository Domains repository
 * @param serviceNetworksRepository Service networks repository, which holds the networks of the project the service joined
 * @param volumesRepository Volumes repository, which holds the volumes the service declares
 * @param daemonVolumesRepository Daemon volumes repository, which reads the volumes the Compose project holds
 * @param providerClient Provider client port
 * @param dockerExecutor Docker executor
 * @param reverseProxy Reverse proxy, which builds the labels of the routing of the service
 * @param logStore Logs store
 * @param secretCipher Secret cipher, which opens the secrets of the service
 * @param payload Run payload
 */
export async function runDeploymentUseCase(
    deploymentsRepository: DeploymentsRepository,
    servicesRepository: ServicesRepository,
    providersRepository: ProvidersRepository,
    serviceVariablesRepository: ServiceVariablesRepository,
    domainsRepository: DomainsRepository,
    serviceNetworksRepository: ServiceNetworksRepository,
    volumesRepository: VolumesRepository,
    daemonVolumesRepository: DaemonVolumesRepository,
    providerClient: ProviderClient,
    dockerExecutor: DockerExecutor,
    reverseProxy: ReverseProxy,
    logStore: LogStore,
    secretCipher: SecretCipher,
    payload: DeploymentRunTask,
): Promise<void> {
    await deploymentsRepository.update(payload.deploymentId, { status: 'running' });

    try {
        const { service, credentials } = await loadServiceContext(
            deploymentsRepository,
            servicesRepository,
            providersRepository,
            payload.deploymentId,
        );

        const emit = (line: string): void => {
            logStore.append(payload.deploymentId, line).catch(() => undefined);
        };

        const archive = await providerClient.getRepositoryArchive(credentials, payload.repositoryId, payload.commit);
        const environment = await getServiceEnvironmentUseCase(serviceVariablesRepository, secretCipher, service.id);
        const domains = await domainsRepository.getByService(service.id);
        const routing = reverseProxy.buildRouting(domains);
        const projectNetworks = await serviceNetworksRepository.listByService(service.id);
        const networks = projectNetworks.map((network) => network.daemonName);
        const target: DeploymentTarget = {
            serviceId: service.id,
            projectName: service.composeProject,
            networkAlias: getServiceSlug(service),
        };

        await dockerExecutor.up(archive, payload.composerPath, target, environment, routing, networks, emit);

        // The record of a volume Compose created never fails a deployment the daemon already brought up.
        await adoptComposeVolumesUseCase(volumesRepository, daemonVolumesRepository, service)
            .catch(() => { emit('▹ The volumes of the Compose file could not be recorded.'); });

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
