import { resolve4, resolve6 } from 'node:dns/promises';

import { Inject, Injectable } from '@nestjs/common';

import type { DnsResolver } from '../../domain/ports/dns-resolver.port';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';

/**
 * Node DNS resolver adapter
 */
@Injectable()
export class NodeDnsResolverAdapter implements DnsResolver {
    constructor(@Inject(NestLoggerAdapter) private readonly logger: AppLogger) {}

    public async resolveAddresses(host: string): Promise<string[]> {
        const [ipv4, ipv6] = await Promise.all([
            this.resolveRecord(host, 'A', resolve4),
            this.resolveRecord(host, 'AAAA', resolve6),
        ]);

        return [...ipv4, ...ipv6];
    }

    /**
     * Resolves one record of a host name, and answers with an empty list when it resolves to none.
     *
     * @param host Host name to resolve
     * @param record Name of the record the call asks the DNS for
     * @param resolver Call of Node that reads that record
     *
     * @returns The addresses of that record, empty when the host name resolves to none
     */
    private async resolveRecord(
        host: string,
        record: string,
        resolver: (host: string) => Promise<string[]>,
    ): Promise<string[]> {
        try {
            return await resolver(host);
        } catch (error) {
            // A host name that carries no record of this kind is the usual answer of this call, and
            // the caller reads it as an empty list. The reason still reaches the log, for the operator.
            this.logger.warn(
                `Could not resolve the record ${record} of ${host}: ${error instanceof Error ? error.message : String(error)}`,
                NodeDnsResolverAdapter.name,
            );

            return [];
        }
    }
}
