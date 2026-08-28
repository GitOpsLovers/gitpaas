import { Inject, Injectable } from '@nestjs/common';

import { HealthProbe } from '../../domain/ports/health-probe.port';

import { RedisConnection } from '@core/infrastructure/redis/redis.connection';

/**
 * Redis health probe.
 */
@Injectable()
export class RedisHealthProbeAdapter implements HealthProbe {
    public readonly name = 'redis';

    constructor(@Inject(RedisConnection) private readonly connection: RedisConnection) {}

    public async check(): Promise<boolean> {
        try {
            await this.connection.getClient().ping();

            return true;
        } catch {
            return false;
        }
    }
}
