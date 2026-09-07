import { ServiceNotFoundError } from '../domain/errors/service.errors';
import { FinalCompose } from '../domain/models/final-compose.models';
import { RepositoryComposeFile } from '../domain/ports/repository-compose-file.port';
import { ServicesRepository } from '../domain/repositories/services.repository';

import { DeploymentsRepository } from '@features/deployments/domain/repositories/deployments.repository';
import { getProviderCredentialsUseCase } from '@features/providers/application/get-provider-credentials.use-case';
import { ProviderClient } from '@features/providers/domain/ports/provider-client.port';
import { ProvidersRepository } from '@features/providers/domain/repositories/providers.repository';
import { assertComposerPath } from '@shared/application/assert-composer-path.use-case';

/**
 * The answer of a service that carries no Compose text at all.
 */
const EMPTY_COMPOSE: FinalCompose = { text: null, origin: 'none' };

/**
 * Use case that answers the final Compose file of a service.
 *
 * @param servicesRepository Services repository
 * @param deploymentsRepository Deployments repository
 * @param providersRepository Providers repository
 * @param providerClient Provider client port
 * @param repositoryComposeFile Reader of the Compose file of a repository
 * @param serviceId Service the Compose file belongs to
 *
 * @returns The Compose text and its origin
 *
 * @throws ServiceNotFoundError When the service does not exist
 * @throws ProviderNotFoundError When the provider of the service no longer exists
 * @throws UnsafeComposeRecipeError When the stored path of the compose file escapes the repository
 */
export async function getFinalComposeUseCase(
    servicesRepository: ServicesRepository,
    deploymentsRepository: DeploymentsRepository,
    providersRepository: ProvidersRepository,
    providerClient: ProviderClient,
    repositoryComposeFile: RepositoryComposeFile,
    serviceId: string,
): Promise<FinalCompose> {
    const service = await servicesRepository.findById(serviceId);

    if (!service) {
        throw new ServiceNotFoundError(serviceId);
    }

    // The repository answers the most recent deployment first, and a deployment of before the
    // feature saved no text of its own.
    const deployments = await deploymentsRepository.getAllByService(serviceId);
    const deployed = deployments.find((deployment) => deployment.finalCompose !== null);

    if (deployed?.finalCompose) {
        return { text: deployed.finalCompose, origin: 'deployment' };
    }

    if (!service.providerId) {
        return EMPTY_COMPOSE;
    }

    const credentials = await getProviderCredentialsUseCase(providersRepository, service.providerId);

    const archive = await providerClient.getRepositoryArchive(
        credentials,
        Number(service.repositoryId),
        service.deploymentBranch,
    );

    // The stored path reaches the archive here, so it is checked again. An empty path is the service
    // that carries no compose file yet, and the reader answers no text for it.
    if (service.composerPath !== '') {
        assertComposerPath(service.composerPath);
    }

    const text = await repositoryComposeFile.read(archive, service.composerPath);

    return text === null ? EMPTY_COMPOSE : { text, origin: 'repository' };
}
