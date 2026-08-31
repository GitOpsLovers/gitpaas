/**
 * Resolver of the addresses a host name of the public DNS points at.
 */
export interface DnsResolver {
    /**
     * Resolves the addresses of IPv4 a host name points at.
     *
     * @param host Host name to resolve
     *
     * @returns The addresses of the host name, empty when it resolves to none
     */
    resolveAddresses: (host: string) => Promise<string[]>;
}
