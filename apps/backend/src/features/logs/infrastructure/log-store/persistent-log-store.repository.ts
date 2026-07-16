import { Inject, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

import { LogEvent, LogStatus } from '../../domain/models/log-event.model';
import { LogStoreRepository } from '../../domain/repositories/log-store.repository';
import { LogsDatabaseRepository } from '../database/logs-db.repository';
import { RedisLogStoreRepository } from '../redis/redis-log-store.repository';

import { toLogRows } from './persistent-log-store.transformer';

/**
 * Persistent log store repository.
 *
 * The logs feature's write port: fans each captured line out live through the
 * Redis log store and, on completion, persists the finished stream to the `logs`
 * table with its terminal status. Consumers (e.g. the deployments runner) only
 * ever call `append`/`complete`; how the stream is buffered and stored stays a
 * logs-internal concern behind this adapter.
 */
@Injectable()
export class PersistentLogStoreRepository implements LogStoreRepository {
    /** Per-stream in-memory buffer of captured lines, flushed to the DB on `complete`. */
    private readonly buffers = new Map<string, string[]>();

    constructor(
        @Inject(RedisLogStoreRepository)
        private readonly logStore: RedisLogStoreRepository,
        @Inject(LogsDatabaseRepository)
        private readonly logsRepository: LogsDatabaseRepository,
    ) {}

    /**
     * Buffers a captured log line and publishes it live.
     *
     * @param streamId Stream identifier
     * @param line Raw log line
     */
    public async append(streamId: string, line: string): Promise<void> {
        this.buffer(streamId).push(line);
        await this.logStore.append(streamId, line);
    }

    /**
     * Persists the buffered stream to the `logs` table and publishes the
     * terminal status live.
     *
     * @param streamId Stream identifier
     * @param status Terminal status of the stream
     */
    public async complete(streamId: string, status: LogStatus): Promise<void> {
        const lines = this.buffers.get(streamId) ?? [];

        this.buffers.delete(streamId);

        await this.logsRepository.createMany(toLogRows(streamId, lines, status));
        await this.logStore.complete(streamId, status);
    }

    /**
     * Stream a log: buffered lines first, then live lines, completing on the
     * terminal `end` event.
     *
     * @param streamId Stream identifier
     */
    public stream(streamId: string): Observable<LogEvent> {
        return this.logStore.stream(streamId);
    }

    /**
     * Remove a stream's buffered log and any stored resources.
     *
     * Drops the in-memory buffer and delegates to the Redis store. The durable
     * `logs` rows are cleaned up by the database cascade, not here.
     *
     * @param streamId Stream identifier
     */
    public async purge(streamId: string): Promise<void> {
        this.buffers.delete(streamId);
        await this.logStore.purge(streamId);
    }

    /**
     * Returns the mutable line buffer for a stream, creating it on first use.
     *
     * @param streamId Stream identifier
     */
    private buffer(streamId: string): string[] {
        let lines = this.buffers.get(streamId);

        if (!lines) {
            lines = [];
            this.buffers.set(streamId, lines);
        }

        return lines;
    }
}
