import type { ClaimDomainDto, UpdateDomainDto } from '@gitpaas/contracts';

import { CertificateState, Domain } from '../models/domain.models';

/**
 * Domains repository
 */
export interface DomainsRepository {
    /**
     * Gets every domain of a service, ordered by host
     *
     * @param serviceId Service id
     *
     * @returns Domains of the service
     */
    getByService: (serviceId: string) => Promise<Domain[]>;

    /**
     * Gets a single domain by id
     *
     * @param id Domain id
     *
     * @returns Domain, or `null` when it does not exist
     */
    findById: (id: string) => Promise<Domain | null>;

    /**
     * Gets a single domain by host, across the whole installation
     *
     * @param host Host of the domain, in small letters
     *
     * @returns Domain, or `null` when no service holds that host
     */
    findByHost: (host: string) => Promise<Domain | null>;

    /**
     * Claims a domain for a service
     *
     * @param serviceId Service the domain belongs to
     * @param claimDto Domain data
     * @param certificateState State the certificate of the new domain starts from
     *
     * @returns Claimed domain
     */
    create: (
        serviceId: string,
        claimDto: ClaimDomainDto,
        certificateState: CertificateState,
    ) => Promise<Domain>;

    /**
     * Changes a domain
     *
     * @param id Domain id
     * @param updateDto Domain data
     * @param certificateState State the certificate returns to, or `undefined` to keep the stored one
     *
     * @returns Updated domain, or `null` when it does not exist
     */
    update: (
        id: string,
        updateDto: UpdateDomainDto,
        certificateState?: CertificateState,
    ) => Promise<Domain | null>;

    /**
     * Removes a domain
     *
     * @param id Domain id
     *
     * @returns `true` when a row was deleted, `false` otherwise
     */
    delete: (id: string) => Promise<boolean>;
}
