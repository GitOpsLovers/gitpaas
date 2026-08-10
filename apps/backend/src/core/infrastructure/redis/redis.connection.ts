import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

import { buildRedisConnectionOptions } from './redis-connection-options';

/**
 * Redis connection.
 *
 * Owns every socket the application opens to Redis and is the only place that
 * knows `ioredis` exists at the infrastructure edge.
 *
 * Two connections are kept apart, because a blocking command occupies its socket
 * for the whole block and would stall every other command queued behind it:
 *
 * - one **command connection**, shared by every non-blocking command;
 * - one **blocking connection**, reserved for the commands that block.
 */
@Injectable()
export class RedisConnection implements OnModuleDestroy {
    /** Shared connection for every command that does not block its socket. */
    private client?: Redis;

    /** Connection reserved for the commands that block their socket. */
    private blockingClient?: Redis;

    /**
     * Returns the shared command connection, opening it on first use.
     *
     * @returns Redis client for non-blocking commands
     */
    public getClient(): Redis {
        this.client ??= new Redis(buildRedisConnectionOptions());

        return this.client;
    }

    /**
     * Returns the blocking connection, opening it on first use.
     *
     * @returns Redis client for the commands that block their socket
     */
    public getBlockingClient(): Redis {
        this.blockingClient ??= new Redis(buildRedisConnectionOptions());

        return this.blockingClient;
    }

    /**
     * Closes every connection when the application shuts down.
     */
    public async onModuleDestroy(): Promise<void> {
        const clients = [this.client, this.blockingClient].filter((client) => !!client);

        this.client = undefined;
        this.blockingClient = undefined;

        await Promise.all(clients.map(async (client) => {
            try {
                await client.quit();
            } catch {
                client.disconnect();
            }
        }));
    }
}
