import { Injectable } from '@nestjs/common';

import { HealthProbe } from '../../domain/repositories/health-probe.repository';

import { RedisClient } from '@core/infrastructure/redis/redis.client';

/**
 * Redis health probe.
 *
 * Probes Redis with a `PING`, reporting `down` on any error or unexpected reply.
 */
@Injectable()
export class RedisHealthProbe implements HealthProbe {
    public readonly name = 'redis';

    constructor(private readonly client: RedisClient) {}

    /**
     * Probes Redis connectivity.
     *
     * @returns `true` when the server replies with `PONG`, `false` otherwise
     */
    public async check(): Promise<boolean> {
        try {
            const reply = await this.client.getClient().ping();

            return reply === 'PONG';
        } catch {
            return false;
        }
    }
}
