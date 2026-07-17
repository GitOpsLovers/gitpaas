import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

/**
 * Redis client.
 */
@Injectable()
export class RedisClient implements OnModuleDestroy {
    private readonly logger = new Logger(RedisClient.name);

    private client: Redis | undefined;

    private readonly subscribers = new Set<Redis>();

    constructor(private readonly config: ConfigService) {}

    /**
     * Lazily-created, reused Redis connection for commands and publishing.
     */
    public getClient(): Redis {
        this.client ??= this.createConnection('commands');

        return this.client;
    }

    /**
     * Creates a fresh, dedicated connection for subscribing to channels.
     */
    public createSubscriber(): Redis {
        const subscriber = this.createConnection('subscriber');

        this.subscribers.add(subscriber);

        return subscriber;
    }

    /**
     * Disconnects and forgets a subscriber connection
     *
     * @param subscriber Subscriber connection to release
     */
    public releaseSubscriber(subscriber: Redis): void {
        this.subscribers.delete(subscriber);
        subscriber.disconnect();
    }

    /**
     * Tears down every open connection when the module is destroyed.
     */
    public onModuleDestroy(): void {
        this.subscribers.forEach((subscriber) => { subscriber.disconnect(); });
        this.subscribers.clear();
        this.client?.disconnect();
        this.client = undefined;
    }

    /**
     * Builds a new ioredis connection from configuration.
     *
     * @param role Human-readable role, only used for logging
     */
    private createConnection(role: string): Redis {
        const host = this.config.get<string>('REDIS_HOST');
        const port = Number(this.config.get('REDIS_PORT'));

        const options: RedisOptions = { host, port, maxRetriesPerRequest: null };

        this.logger.log(`Connecting Redis ${role} connection to ${host}:${port}`);

        return new Redis(options);
    }
}
