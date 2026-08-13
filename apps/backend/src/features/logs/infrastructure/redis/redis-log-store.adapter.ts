import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

import { LogEvent, LogStatus, StoredLogEvent } from '../../domain/models/log-event.models';
import { LogStore } from '../../domain/ports/log-store.port';
import type { LogsRepository } from '../../domain/repositories/logs.repository';
import { DatabaseLogsRepository } from '../database/db-logs.repository';

import { readLogStream } from './redis-log-reader';
import {
    LOG_STORE_CONTEXT, LOG_STREAM_GRACE_SECONDS, LOG_STREAM_PRODUCER_LEASE_SECONDS,
} from './redis-log-store.constants';
import {
    RedisStreamEntry, toCreateLogDtos, toLogStreamKey, toProducerLeaseKey, toStreamFields,
} from './redis-log-store.transformer';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';
import { RedisConnection } from '@core/infrastructure/redis/redis.connection';
import { recordDependencyCall } from '@core/infrastructure/telemetry/telemetry-deps';

/**
 * Redis log store adapter.
 */
@Injectable()
export class RedisLogStoreAdapter implements LogStore {
    /** Upper bound on entries kept per deployment; older ones are trimmed by Redis. */
    private readonly maxLines: number;

    constructor(
        @Inject(RedisConnection)
        private readonly connection: RedisConnection,
        @Inject(DatabaseLogsRepository)
        private readonly repository: LogsRepository,
        @Inject(NestLoggerAdapter)
        private readonly logger: AppLogger,
        config: ConfigService,
    ) {
        this.maxLines = config.getOrThrow<number>('LOGS_MAX_LINES');
    }

    /**
     * Append a captured log line to the Redis stream.
     *
     * @param streamId Stream identifier
     * @param line Raw log line
     */
    public async append(streamId: string, line: string): Promise<void> {
        try {
            await this.appendEntry(streamId, { type: 'line', data: line });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            this.logger.error(
                `Failed to append a log line for deployment ${streamId}: ${message}`,
                error,
                LOG_STORE_CONTEXT,
            );
        }
    }

    /**
     * Mark a stream as finished
     *
     * Save the logs to the persistence layer and let the hot copy in Redis expire after the grace period.
     *
     * @param streamId Stream identifier
     * @param status Terminal status of the stream
     */
    public async complete(streamId: string, status: LogStatus): Promise<void> {
        try {
            const client = this.connection.getClient();

            await this.appendEntry(streamId, { type: 'end', status });
            await this.run(() => client.del(toProducerLeaseKey(streamId)));

            const archived = await this.archiveStream(streamId);

            if (archived) {
                await this.run(() => client.expire(toLogStreamKey(streamId), LOG_STREAM_GRACE_SECONDS));
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            this.logger.error(
                `Failed to complete the log of deployment ${streamId}: ${message}`,
                error,
                LOG_STORE_CONTEXT,
            );
        }
    }

    /**
     * Stream a log
     *
     * @param streamId Stream identifier
     *
     * @returns Cold observable of the stream's log events
     */
    public stream(streamId: string): Observable<LogEvent> {
        return new Observable<LogEvent>((subscriber) => {
            let cancelled = false;

            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            readLogStream(this.connection, this.repository, this.logger, streamId, subscriber, () => cancelled);

            return () => { cancelled = true; };
        });
    }

    /**
     * Remove a stream's entries.
     *
     * @param streamId Stream identifier
     */
    public async purge(streamId: string): Promise<void> {
        try {
            await this.run(() => this.connection.getClient().del(toLogStreamKey(streamId)));
            await this.run(() => this.connection.getClient().del(toProducerLeaseKey(streamId)));
            await this.repository.deleteByDeployment(streamId);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            this.logger.error(
                `Failed to purge the log of deployment ${streamId}: ${message}`,
                error,
                LOG_STORE_CONTEXT,
            );
        }
    }

    /**
     * Append one entry to log stream
     *
     * @param streamId Stream identifier
     * @param event Log event to append
     */
    private async appendEntry(streamId: string, event: StoredLogEvent): Promise<void> {
        const client = this.connection.getClient();
        const key = toLogStreamKey(streamId);
        const leaseKey = toProducerLeaseKey(streamId);
        const fields = toStreamFields(event);
        const pipeline = client.multi();

        if (this.maxLines > 0) {
            pipeline.xadd(key, 'MAXLEN', '~', this.maxLines, '*', ...fields);
        } else {
            pipeline.xadd(key, '*', ...fields);
        }

        await this.run(() => pipeline.set(leaseKey, '1', 'EX', LOG_STREAM_PRODUCER_LEASE_SECONDS).exec());
    }

    /**
     * Copy a finished stream from Redis into PostgreSQL.
     *
     * @param streamId Stream identifier
     *
     * @returns True when the whole stream reached the archive
     */
    private async archiveStream(streamId: string): Promise<boolean> {
        try {
            const client = this.connection.getClient();
            const entries = await this.run(() => client.xrange(toLogStreamKey(streamId), '-', '+')) as RedisStreamEntry[];
            const createDtos = toCreateLogDtos(streamId, entries);

            if (createDtos.length > 0) {
                await this.repository.createMany(createDtos);
            }

            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            this.logger.error(
                `Failed to archive the log of deployment ${streamId}: ${message}`,
                error,
                LOG_STORE_CONTEXT,
            );

            return false;
        }
    }

    /**
     * Runs a call against Redis, counting it on the telemetry event of the current unit of work.
     *
     * @param operation Redis call to run
     *
     * @returns Whatever the operation resolves to
     */
    private async run<T>(operation: () => Promise<T>): Promise<T> {
        const startedAt = performance.now();

        try {
            const result = await operation();

            recordDependencyCall('redis', performance.now() - startedAt, false);

            return result;
        } catch (error) {
            recordDependencyCall('redis', performance.now() - startedAt, true);

            throw error;
        }
    }
}
