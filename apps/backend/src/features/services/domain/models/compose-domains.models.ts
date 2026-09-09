/**
 * One domain the compose file of a service declares, inside the key `x-gitpaas-domain` of one of its compose services.
 */
export interface ComposeDomainDeclaration {
    targetService: string;
    host: string;
    port: number;
    https: boolean;
}

/**
 * The domains the compose file of a service declares, as GitPaaS last read them.
 */
export interface ComposeDomainsCache {
    domains: ComposeDomainDeclaration[];
    refreshedAt: Date;
}
