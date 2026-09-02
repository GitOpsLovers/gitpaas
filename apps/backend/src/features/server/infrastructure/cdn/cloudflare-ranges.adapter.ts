import { Inject, Injectable } from '@nestjs/common';

import {
    CLOUDFLARE_IPV4_RANGES_URL,
    CLOUDFLARE_IPV6_RANGES_URL,
    CLOUDFLARE_RANGES_CACHE_TTL_MS,
    CLOUDFLARE_RANGES_TIMEOUT_MS,
} from '../../domain/constants/cloudflare-ranges.constants';
import type { CloudflareRanges } from '../../domain/ports/cloudflare-ranges.port';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';

/**
 * A complete read of the two lists of Cloudflare, and the instant it was taken.
 */
interface CachedRanges {
    readonly ranges: string[];
    readonly readAt: number;
}

/**
 * Cloudflare ranges adapter
 */
@Injectable()
export class CloudflareRangesAdapter implements CloudflareRanges {
    private cached: CachedRanges | null = null;

    constructor(@Inject(NestLoggerAdapter) private readonly logger: AppLogger) {}

    public async readRanges(): Promise<string[]> {
        const cached = this.cached;

        if (cached !== null && Date.now() - cached.readAt < CLOUDFLARE_RANGES_CACHE_TTL_MS) {
            return cached.ranges;
        }

        const [ipv4, ipv6] = await Promise.all([
            this.fetchRanges(CLOUDFLARE_IPV4_RANGES_URL),
            this.fetchRanges(CLOUDFLARE_IPV6_RANGES_URL),
        ]);

        const ranges = [...(ipv4 ?? []), ...(ipv6 ?? [])];

        // A read that failed in part is answered, and never kept. Thus the next check asks Cloudflare
        // again instead of reading a list that carries half of the ranges for a day.
        if (ipv4 === null || ipv6 === null) {
            return ranges;
        }

        this.cached = { ranges, readAt: Date.now() };

        return ranges;
    }

    /**
     * Reads one list of ranges of Cloudflare, and answers with nothing when the read fails.
     *
     * @param url Address of the list Cloudflare publishes
     *
     * @returns The blocks CIDR of that list, or null when Cloudflare does not answer it
     */
    private async fetchRanges(url: string): Promise<string[] | null> {
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(CLOUDFLARE_RANGES_TIMEOUT_MS) });

            if (!response.ok) {
                throw new Error(`Cloudflare answered ${response.status}`);
            }

            return this.toRanges(await response.text());
        } catch (error) {
            // The check of the domain is advisory, so a list the platform cannot read only costs the
            // recognition of the provider. The reason still reaches the log, for the operator.
            this.logger.warn(
                `Could not read the ranges of Cloudflare at ${url}: ${error instanceof Error ? error.message : String(error)}`,
                CloudflareRangesAdapter.name,
            );

            return null;
        }
    }

    /**
     * Reads the blocks CIDR of the body Cloudflare publishes, which carries one block on one line.
     *
     * @param body Body of the answer of Cloudflare
     *
     * @returns The blocks CIDR of that body, with no empty line
     */
    private toRanges(body: string): string[] {
        return body.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
    }
}
