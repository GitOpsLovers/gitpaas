import { ServiceNotFoundError } from '../domain/errors/service.errors';
import { ComposeDomainsCache } from '../domain/models/compose-domains.models';
import { RepositoryComposeFile } from '../domain/ports/repository-compose-file.port';
import { ServicesRepository } from '../domain/repositories/services.repository';

import { parseComposeDomainsUseCase } from './parse-compose-domains.use-case';

import { getProviderCredentialsUseCase } from '@features/providers/application/get-provider-credentials.use-case';
import { ProviderClient } from '@features/providers/domain/ports/provider-client.port';
import { ProvidersRepository } from '@features/providers/domain/repositories/providers.repository';
import { assertComposerPath } from '@shared/application/assert-composer-path.use-case';

/**
 * Use case that reads the compose file of the repository of a service and caches the domains its key `x-gitpaas-domain` declares.
 *
 * @param servicesRepository Services repository
 * @param providersRepository Providers repository
 * @param providerClient Provider client port
 * @param repositoryComposeFile Reader of the Compose file of a repository
 * @param serviceId Service the compose file belongs to
 *
 * @returns The cache that the use case wrote, or `null` when it left the cache untouched
 *
 * @throws {ServiceNotFoundError} When the service does not exist
 * @throws {ProviderNotFoundError} When the provider of the service no longer exists
 * @throws {UnsafeComposeRecipeError} When the stored path of the compose file escapes the repository
 */
export async function refreshComposeDomainsUseCase(
    servicesRepository: ServicesRepository,
    providersRepository: ProvidersRepository,
    providerClient: ProviderClient,
    repositoryComposeFile: RepositoryComposeFile,
    serviceId: string,
): Promise<ComposeDomainsCache | null> {
    const service = await servicesRepository.findById(serviceId);

    if (!service) {
        throw new ServiceNotFoundError(serviceId);
    }

    if (!service.providerId || service.composerPath === '') {
        return null;
    }

    assertComposerPath(service.composerPath);

    const credentials = await getProviderCredentialsUseCase(providersRepository, service.providerId);

    const archive = await providerClient.getRepositoryArchive(
        credentials,
        Number(service.repositoryId),
        service.deploymentBranch,
    );

    const text = await repositoryComposeFile.read(archive, service.composerPath);

    if (text === null) {
        return null;
    }

    const cache: ComposeDomainsCache = {
        domains: parseComposeDomainsUseCase(text),
        refreshedAt: new Date(),
    };

    await servicesRepository.saveComposeDomains(serviceId, cache);

    return cache;
}
