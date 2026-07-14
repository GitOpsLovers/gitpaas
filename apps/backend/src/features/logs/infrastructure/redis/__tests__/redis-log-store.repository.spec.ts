import { EventEmitter } from 'node:events';

import { firstValueFrom, toArray } from 'rxjs';

import { LogEvent } from '../../../domain/models/log-event.model';
import { RedisLogStoreRepository } from '../redis-log-store.repository';

import { RedisClient } from '@core/infrastructure/redis/redis.client';

/** Resolves after pending microtasks/timers, letting the subscribe callback run. */
const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

/**
 * Minimal in-memory stand-in for {@link RedisClient} implementing just the list,
 * counter and pub/sub surface the store uses. A shared bus links publishers to
 * subscriber connections.
 */
function createFakeRedis(): RedisClient {
    const lists = new Map<string, string[]>();
    const counters = new Map<string, number>();
    const bus = new EventEmitter();

    const client = {
        incr: (key: string): Promise<number> => {
            const next = (counters.get(key) ?? 0) + 1;

            counters.set(key, next);

            return Promise.resolve(next);
        },
        lrange: (key: string): Promise<string[]> => Promise.resolve([...(lists.get(key) ?? [])]),
        publish: (channel: string, message: string): Promise<number> => {
            bus.emit(channel, message);

            return Promise.resolve(1);
        },
        multi() {
            const builder = {
                rpush: (key: string, value: string) => {
                    const list = lists.get(key) ?? [];

                    list.push(value);
                    lists.set(key, list);

                    return builder;
                },
                ltrim: () => builder,
                expire: () => builder,
                exec: () => Promise.resolve([]),
            };

            return builder;
        },
    };

    const createSubscriber = () => {
        const connection = new EventEmitter() as EventEmitter & {
            subscribe: (channel: string, cb: (error: Error | null) => void) => void;
            disconnect: () => void;
        };
        let handler: ((message: string) => void) | undefined;
        let channelName: string | undefined;

        connection.subscribe = (channel, cb) => {
            channelName = channel;
            handler = (message: string) => connection.emit('message', channel, message);
            bus.on(channel, handler);
            // ioredis invokes the callback asynchronously once subscribed.
            void Promise.resolve().then(() => { cb(null); });
        };
        connection.disconnect = () => {
            if (channelName && handler) {
                bus.off(channelName, handler);
            }
        };

        return connection;
    };

    return {
        getClient: () => client,
        createSubscriber,
        releaseSubscriber: (connection: { disconnect: () => void }) => { connection.disconnect(); },
    };
}

describe('RedisLogStoreRepository', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';

    let store: RedisLogStoreRepository;

    beforeEach(() => {
        store = new RedisLogStoreRepository(createFakeRedis());
    });

    it('replays buffered lines then completes for a finished stream', async () => {
        await store.append(id, 'line 1');
        await store.append(id, 'line 2');
        await store.complete(id, 'success');

        const events = await firstValueFrom(store.stream(id).pipe(toArray()));

        expect(events).toEqual<LogEvent[]>([
            { type: 'line', data: 'line 1' },
            { type: 'line', data: 'line 2' },
            { type: 'end', status: 'success' },
        ]);
    });

    it('streams live lines to an already-connected subscriber', async () => {
        const received: LogEvent[] = [];
        const subscription = store.stream(id).subscribe((event) => received.push(event));

        await flush();
        await store.append(id, 'live line');
        await flush();
        await store.complete(id, 'failed');
        await flush();

        expect(received).toEqual<LogEvent[]>([
            { type: 'line', data: 'live line' },
            { type: 'end', status: 'failed' },
        ]);

        subscription.unsubscribe();
    });

    it('does not duplicate a line that is both replayed and delivered live', async () => {
        await store.append(id, 'buffered');

        const received: LogEvent[] = [];
        const subscription = store.stream(id).subscribe((event) => received.push(event));

        await flush();
        await store.append(id, 'fresh');
        await flush();
        await store.complete(id, 'success');
        await flush();

        expect(received).toEqual<LogEvent[]>([
            { type: 'line', data: 'buffered' },
            { type: 'line', data: 'fresh' },
            { type: 'end', status: 'success' },
        ]);

        subscription.unsubscribe();
    });
});
