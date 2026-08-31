import { resolve4 } from 'node:dns/promises';

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
        try {
            return await resolve4(host);
        } catch (error) {
            // A host name that resolves nowhere is the usual answer of this call, and the caller
            // reads it as an empty list. The reason still reaches the log, for the operator.
            this.logger.warn(
                `Could not resolve ${host}: ${error instanceof Error ? error.message : String(error)}`,
                NodeDnsResolverAdapter.name,
            );

            return [];
        }
    }
}
