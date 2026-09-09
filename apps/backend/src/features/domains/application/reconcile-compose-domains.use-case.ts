import type { ClaimDomainDto } from '@gitpaas/contracts';

import { DomainTakenError } from '../domain/errors/domain.errors';
import { Domain } from '../domain/models/domain.models';
import { DomainsRepository } from '../domain/repositories/domains.repository';

import { claimDomainUseCase } from './claim-domain.use-case';
import { updateDomainUseCase } from './update-domain.use-case';

import { ComposeDomainDeclaration } from '@features/services/domain/models/compose-domains.models';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

/**
 * Tells whether the record of a domain already carries what the compose file declares.
 *
 * @param domain Domain as the record holds it
 * @param declaration Domain the compose file declares
 *
 * @returns `true` when no field of the declaration differs from the record
 */
function matchesDeclaration(domain: Domain, declaration: ComposeDomainDeclaration): boolean {
    return domain.targetService === declaration.targetService
        && domain.port === declaration.port
        && domain.https === declaration.https;
}

/**
 * Brings one declaration of the compose file to the records of the domains.
 *
 * @param domainsRepository Domains repository
 * @param serviceId Service the declaration belongs to
 * @param declaration Domain the compose file declares
 *
 * @throws DomainTakenError When another service of the installation already holds the host
 */
async function reconcileDeclaration(
    domainsRepository: DomainsRepository,
    serviceId: string,
    declaration: ComposeDomainDeclaration,
): Promise<void> {
    const claimDto: ClaimDomainDto = {
        host: declaration.host,
        targetService: declaration.targetService,
        port: declaration.port,
        https: declaration.https,
    };

    const existing = await domainsRepository.findByHost(declaration.host);

    if (!existing) {
        await claimDomainUseCase(domainsRepository, serviceId, claimDto, 'compose');

        return;
    }

    if (existing.serviceId !== serviceId) {
        throw new DomainTakenError(declaration.host);
    }

    // The value the user saved in the tab always wins, so the compose file never overwrites it.
    if (existing.origin === 'user' || matchesDeclaration(existing, declaration)) {
        return;
    }

    await updateDomainUseCase(
        domainsRepository,
        serviceId,
        existing.id,
        {
            targetService: declaration.targetService,
            port: declaration.port,
            https: declaration.https,
        },
        'compose',
    );
}

/**
 * Use case that brings the domains a service holds to the declarations of its compose file.
 *
 * @param domainsRepository Domains repository
 * @param servicesRepository Services repository, which holds the cache of the compose file
 * @param serviceId Service the domains belong to
 *
 * @throws DomainTakenError When another service of the installation already holds a declared host
 */
export async function reconcileComposeDomainsUseCase(
    domainsRepository: DomainsRepository,
    servicesRepository: ServicesRepository,
    serviceId: string,
): Promise<void> {
    const cache = await servicesRepository.findComposeDomains(serviceId);

    if (!cache) {
        return;
    }

    const declaredHosts = new Set(cache.domains.map((declaration) => declaration.host));
    const stored = await domainsRepository.getByService(serviceId);

    for (const domain of stored) {
        if (domain.origin === 'compose' && !declaredHosts.has(domain.host)) {
            await domainsRepository.delete(domain.id);
        }
    }

    for (const declaration of cache.domains) {
        await reconcileDeclaration(domainsRepository, serviceId, declaration);
    }
}
