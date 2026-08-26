import { ServiceNotDeployableError } from '../domain/errors/deployment.errors';
import { DockerExecutor } from '../domain/ports/docker-executor.port';
import { DeploymentsRepository } from '../domain/repositories/deployments.repository';

import { getProviderCredentialsUseCase } from '@features/providers/application/get-provider-credentials.use-case';
import { ProviderClient } from '@features/providers/domain/ports/provider-client.port';
import { ProvidersRepository } from '@features/providers/domain/repositories/providers.repository';
import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

/**
 * Use case that lists the compose services the last deployment of a service brought up.
 *
 * @param deploymentsRepository Deployments repository
 * @param servicesRepository Services repository
 * @param providersRepository Providers repository
 * @param providerClient Provider client port
 * @param dockerExecutor Docker executor
 * @param serviceId Service the deployments belong to
 *
 * @returns The names of the compose services of the recipe.
 *
 * @throws ServiceNotFoundError When the service does not exist
 * @throws ServiceNotDeployableError When the service names no provider
 * @throws ProviderNotFoundError When the provider of the service no longer exists
 */
export async function getComposeServicesUseCase(
    deploymentsRepository: DeploymentsRepository,
    servicesRepository: ServicesRepository,
    providersRepository: ProvidersRepository,
    providerClient: ProviderClient,
    dockerExecutor: DockerExecutor,
    serviceId: string,
): Promise<string[]> {
    const service = await servicesRepository.findById(serviceId);

    if (!service) {
        throw new ServiceNotFoundError(serviceId);
    }

    // The repository answers the most recent deployment first.
    const [lastDeployment] = await deploymentsRepository.getAllByService(serviceId);

    if (!lastDeployment) {
        return [];
    }

    if (!service.providerId) {
        throw new ServiceNotDeployableError();
    }

    const credentials = await getProviderCredentialsUseCase(providersRepository, service.providerId);

    const archive = await providerClient.getRepositoryArchive(
        credentials,
        Number(service.repositoryId),
        lastDeployment.commit ?? lastDeployment.branch,
    );

    return dockerExecutor.listComposeServices(archive, lastDeployment.composerPath);
}
