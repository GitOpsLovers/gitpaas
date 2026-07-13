import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

import { LogEvent, LogStatus } from '../../domain/models/log-event.model';
import { LogStoreRepository } from '../../domain/repositories/log-store.repository';

import { RedisClient } from '@core/redis/infrastructure/redis.client';

/** How long a log stream's buffer is kept in Redis after its last activity. */
const TTL_SECONDS = 60 * 60 * 24;

/** Upper bound on buffered lines per log stream; older lines are dropped. */
const MAX_LINES = 5000;

/** A stored/published event carries a monotonic sequence used to dedupe replay vs. live. */
type StoredEvent = { seq: number } & LogEvent;

/**
 * Redis log store repository
 */
@Injectable()
export class RedisLogStoreRepository implements LogStoreRepository {
    constructor(private readonly redis: RedisClient) {}

    /**
     * Append a captured log line to a stream's buffer and publish it live.
     *
     * @param streamId Stream identifier
     * @param line Raw log line
     */
    public async append(streamId: string, line: string): Promise<void> {
        await this.publish(streamId, { type: 'line', data: line });
    }

    /**
     * Mark a stream's log as finished.
     *
     * @param streamId Stream identifier
     * @param status Terminal status of the stream
     */
    public async complete(streamId: string, status: LogStatus): Promise<void> {
        await this.publish(streamId, { type: 'end', status });
    }

    /**
     * Stream a log: buffered lines first, then live lines, completing
     * on the terminal `end` event.
     *
     * @param streamId Stream identifier
     */
    public stream(streamId: string): Observable<LogEvent> {
        const channel = this.channelKey(streamId);

        return new Observable<LogEvent>((subscriber) => {
            const connection = this.redis.createSubscriber();

            let replaying = true;
            let ended = false;
            let maxSeq = 0;
            const buffered: StoredEvent[] = [];

            const emit = (event: StoredEvent): void => {
                // Drop anything already emitted (replay/live overlap) or out of order.
                if (ended || event.seq <= maxSeq) {
                    return;
                }

                maxSeq = event.seq;

                if (event.type === 'end') {
                    subscriber.next({ type: 'end', status: event.status });
                    ended = true;
                    subscriber.complete();

                    return;
                }

                subscriber.next({ type: 'line', data: event.data });
            };

            connection.on('message', (incoming: string, payload: string) => {
                if (incoming !== channel) {
                    return;
                }

                const event = JSON.parse(payload) as StoredEvent;

                if (replaying) {
                    buffered.push(event);

                    return;
                }

                emit(event);
            });

            // The callback drives control flow; the returned promise is redundant.
            void connection.subscribe(channel, (error) => {
                if (error) {
                    subscriber.error(error);

                    return;
                }

                // Subscribed: replay the durable buffer, then flush live events that
                // arrived while we were replaying.
                this.redis
                    .getClient()
                    .lrange(this.listKey(streamId), 0, -1)
                    .then((items) => {
                        items.forEach((item) => { emit(JSON.parse(item) as StoredEvent); });

                        replaying = false;
                        buffered.forEach(emit);
                        buffered.length = 0;
                    })
                    .catch((lrangeError: unknown) => { subscriber.error(lrangeError); });
            });

            return () => {
                this.redis.releaseSubscriber(connection);
            };
        });
    }

    /**
     * Assigns a sequence, persists the event to the list (capped + TTL'd) and
     * publishes it to live subscribers.
     *
     * @param streamId Stream identifier
     * @param event Event to store and publish
     */
    private async publish(streamId: string, event: LogEvent): Promise<void> {
        const client = this.redis.getClient();
        const listKey = this.listKey(streamId);
        const seqKey = this.seqKey(streamId);

        const seq = await client.incr(seqKey);
        const payload = JSON.stringify({ seq, ...event } satisfies StoredEvent);

        await client
            .multi()
            .rpush(listKey, payload)
            .ltrim(listKey, -MAX_LINES, -1)
            .expire(listKey, TTL_SECONDS)
            .expire(seqKey, TTL_SECONDS)
            .exec();

        await client.publish(this.channelKey(streamId), payload);
    }

    /**
     * Redis key for a log stream's buffer list.
     */
    private listKey(streamId: string): string {
        return `logs:${streamId}`;
    }

    /**
     * Redis key for a log stream's sequence counter.
     */
    private seqKey(streamId: string): string {
        return `logs:${streamId}:seq`;
    }

    /**
     * Redis pub/sub channel for a log stream's live log events.
     */
    private channelKey(streamId: string): string {
        return `logs:${streamId}:events`;
    }
}
