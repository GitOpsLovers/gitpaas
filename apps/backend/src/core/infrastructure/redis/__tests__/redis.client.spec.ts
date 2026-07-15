import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { RedisClient } from '../redis.client';

// `ioredis` is replaced by a `jest.fn()` constructor so `new Redis(...)` never
// opens a real connection. Each instance exposes a `disconnect` jest.fn so the
// teardown/release branches can be asserted without touching the network.
jest.mock('ioredis', () => jest.fn().mockImplementation(() => ({ disconnect: jest.fn() })));

const RedisMock = Redis as unknown as jest.Mock;

/** The connection object returned by `new Redis(...)` for the given creation index. */
const connectionAt = (index: number): { disconnect: jest.Mock } =>
    RedisMock.mock.results[index].value as { disconnect: jest.Mock };

/** Build a stub `ConfigService` whose `get` returns the provided values (falling back to the default). */
const createConfig = (values: Record<string, unknown> = {}): ConfigService =>
    ({
        get: jest.fn((key: string, defaultValue?: unknown) => (key in values ? values[key] : defaultValue)),
    }) as unknown as ConfigService;

describe('RedisClient', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getClient', () => {
        it('builds a Redis connection from the configured host and port', () => {
            const client = new RedisClient(createConfig({ REDIS_HOST: '10.0.0.7', REDIS_PORT: 6380 }));

            const result = client.getClient();

            expect(RedisMock).toHaveBeenCalledTimes(1);
            expect(RedisMock).toHaveBeenCalledWith({
                host: '10.0.0.7',
                port: 6380,
                maxRetriesPerRequest: null,
            });
            expect(result).toBe(connectionAt(0));
        });

        it('falls back to the default host and port when config is absent', () => {
            const client = new RedisClient(createConfig());

            client.getClient();

            expect(RedisMock).toHaveBeenCalledWith({
                host: '127.0.0.1',
                port: 6379,
                maxRetriesPerRequest: null,
            });
        });

        it('coerces a string port from config into a number', () => {
            const client = new RedisClient(createConfig({ REDIS_PORT: '6390' }));

            client.getClient();

            expect(RedisMock).toHaveBeenCalledWith(expect.objectContaining({ port: 6390 }));
        });

        it('memoizes the client, building Redis only once across calls', () => {
            const client = new RedisClient(createConfig());

            const first = client.getClient();
            const second = client.getClient();

            expect(first).toBe(second);
            expect(RedisMock).toHaveBeenCalledTimes(1);
        });
    });

    describe('createSubscriber', () => {
        it('builds a fresh dedicated connection on each call', () => {
            const client = new RedisClient(createConfig());

            const first = client.createSubscriber();
            const second = client.createSubscriber();

            expect(RedisMock).toHaveBeenCalledTimes(2);
            expect(first).toBe(connectionAt(0));
            expect(second).toBe(connectionAt(1));
            expect(first).not.toBe(second);
        });

        it('does not reuse or affect the memoized command client', () => {
            const client = new RedisClient(createConfig());

            const commandClient = client.getClient();
            const subscriber = client.createSubscriber();

            expect(subscriber).not.toBe(commandClient);
            expect(RedisMock).toHaveBeenCalledTimes(2);
        });
    });

    describe('releaseSubscriber', () => {
        it('disconnects the released subscriber', () => {
            const client = new RedisClient(createConfig());
            const subscriber = client.createSubscriber();

            client.releaseSubscriber(subscriber);

            expect((subscriber as unknown as { disconnect: jest.Mock }).disconnect).toHaveBeenCalledTimes(1);
        });

        it('forgets the released subscriber so module teardown does not disconnect it again', () => {
            const client = new RedisClient(createConfig());
            const subscriber = client.createSubscriber();
            const disconnect = (subscriber as unknown as { disconnect: jest.Mock }).disconnect;

            client.releaseSubscriber(subscriber);
            client.onModuleDestroy();

            expect(disconnect).toHaveBeenCalledTimes(1);
        });
    });

    describe('onModuleDestroy', () => {
        it('disconnects every open subscriber and the command client, then clears them', () => {
            const client = new RedisClient(createConfig());
            const commandClient = client.getClient() as unknown as { disconnect: jest.Mock };
            const subA = client.createSubscriber() as unknown as { disconnect: jest.Mock };
            const subB = client.createSubscriber() as unknown as { disconnect: jest.Mock };

            client.onModuleDestroy();

            expect(commandClient.disconnect).toHaveBeenCalledTimes(1);
            expect(subA.disconnect).toHaveBeenCalledTimes(1);
            expect(subB.disconnect).toHaveBeenCalledTimes(1);
        });

        it('rebuilds the command client on the next getClient call after teardown', () => {
            const client = new RedisClient(createConfig());

            client.getClient();
            client.onModuleDestroy();
            client.getClient();

            expect(RedisMock).toHaveBeenCalledTimes(2);
        });

        it('does not disconnect a subscriber twice across repeated teardowns', () => {
            const client = new RedisClient(createConfig());
            const subscriber = client.createSubscriber() as unknown as { disconnect: jest.Mock };

            client.onModuleDestroy();
            client.onModuleDestroy();

            expect(subscriber.disconnect).toHaveBeenCalledTimes(1);
        });

        it('is a no-op when there are no open connections', () => {
            const client = new RedisClient(createConfig());

            expect(() => { client.onModuleDestroy(); }).not.toThrow();
            expect(RedisMock).not.toHaveBeenCalled();
        });
    });
});
