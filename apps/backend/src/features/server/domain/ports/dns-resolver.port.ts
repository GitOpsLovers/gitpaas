/**
 * Resolver of the addresses a host name of the public DNS points at.
 */
export interface DnsResolver {
    /**
     * Resolves the addresses of IPv4 and of IPv6 a host name points at.
     *
     * @param host Host name to resolve
     *
     * @returns The records A and AAAA of the host name in one list, empty when it resolves to none
     */
    resolveAddresses: (host: string) => Promise<string[]>;
}
