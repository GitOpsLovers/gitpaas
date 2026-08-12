import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

import type { AppLogger } from '../../domain/ports/app-logger.port';
import { NestLoggerAdapter } from '../logging/nest-logger.adapter';

import { buildRedisConnectionOptions } from './redis-connection-options';

/**
 * Redis connection.
 */
@Injectable()
export class RedisConnection implements OnModuleDestroy {
    constructor(
        @Inject(NestLoggerAdapter) private readonly logger: AppLogger,
    ) {}

    /**
     * Shared connection for every command that does not block its socket.
     */
    private client?: Redis;

    /**
     * Connection reserved for the commands that block their socket.
     */
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
            } catch (error: unknown) {
                this.logger.warn(`Redis connection refused to quit cleanly, disconnecting it: ${String(error)}`, RedisConnection.name);

                client.disconnect();
            }
        }));
    }
}
