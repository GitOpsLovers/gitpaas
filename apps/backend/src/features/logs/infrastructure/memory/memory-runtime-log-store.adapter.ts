import type { RuntimeLogLine } from '@gitpaas/contracts';
import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { defer, Observable, Subject } from 'rxjs';

import { CreateRuntimeLogDto } from '../../domain/dtos/create-runtime-log.dto';
import { RuntimeLogReadOptions } from '../../domain/models/runtime-log.models';
import { RuntimeLogStore } from '../../domain/ports/runtime-log-store.port';
import type { RuntimeLogsRepository } from '../../domain/repositories/runtime-logs.repository';
import { DatabaseRuntimeLogsRepository } from '../database/db-runtime-logs.repository';

import { RUNTIME_LOG_FLUSH_INTERVAL_MS, RUNTIME_LOG_FLUSH_SIZE, RUNTIME_LOG_STORE_CONTEXT } from './runtime-log-store.constants';
import { toCreateRuntimeLogDto, toRuntimeLogLine } from './runtime-log-store.transformer';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';

/**
 * Runtime log store that buffers the lines in memory and writes them to PostgreSQL.
 */
@Injectable()
export class MemoryRuntimeLogStoreAdapter implements RuntimeLogStore, OnModuleDestroy {
    /**
     * The lines that wait for the next write, in the order the containers wrote them.
     */
    private readonly pending: CreateRuntimeLogDto[] = [];

    /**
     * The live stream of each container a client listens to.
     */
    private readonly subjects = new Map<string, Subject<RuntimeLogLine>>();

    /**
     * The deadline of the batch that waits, absent when no line waits.
     */
    private timer: NodeJS.Timeout | null = null;

    constructor(
        @Inject(DatabaseRuntimeLogsRepository)
        private readonly repository: RuntimeLogsRepository,
        @Inject(NestLoggerAdapter)
        private readonly logger: AppLogger,
    ) {}

    public append(containerId: string, line: RuntimeLogLine): void {
        this.pending.push(toCreateRuntimeLogDto(containerId, line, new Date()));
        this.subjects.get(containerId)?.next(line);

        if (this.pending.length >= RUNTIME_LOG_FLUSH_SIZE) {
            this.flushInBackground();

            return;
        }

        this.scheduleFlush();
    }

    public async read(containerId: string, options: RuntimeLogReadOptions = {}): Promise<RuntimeLogLine[]> {
        const stored = await this.repository.getByContainer(containerId, options);
        const waiting = this.pending.filter((dto) => dto.containerId === containerId
            && (options.since === undefined || dto.timestamp.getTime() >= options.since.getTime()));
        const lines = [...stored, ...waiting].map(toRuntimeLogLine);

        return options.tail === undefined ? lines : lines.slice(-options.tail);
    }

    public stream(containerId: string): Observable<RuntimeLogLine> {
        return defer(() => this.subjectFor(containerId));
    }

    public close(containerId: string): void {
        const subject = this.subjects.get(containerId);

        this.subjects.delete(containerId);
        subject?.complete();
    }

    public async flush(): Promise<void> {
        this.clearTimer();

        const batch = this.pending.splice(0, this.pending.length);

        if (batch.length === 0) {
            return;
        }

        try {
            await this.repository.createMany(batch);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            this.logger.error(
                `Failed to write ${batch.length} line(s) of the output of a container: ${message}`,
                error,
                RUNTIME_LOG_STORE_CONTEXT,
            );
        }
    }

    /**
     * Writes the lines that wait and ends every live stream, so a shutdown loses no output.
     */
    public async onModuleDestroy(): Promise<void> {
        for (const containerId of [...this.subjects.keys()]) {
            this.close(containerId);
        }

        await this.flush();
    }

    /**
     * Gives the live stream of a container, and opens it when no client listened yet.
     *
     * @param containerId Identifier of the container
     *
     * @returns Subject the appended lines of that container reach
     */
    private subjectFor(containerId: string): Subject<RuntimeLogLine> {
        const existing = this.subjects.get(containerId);

        if (existing) {
            return existing;
        }

        const subject = new Subject<RuntimeLogLine>();

        this.subjects.set(containerId, subject);

        return subject;
    }

    /**
     * Writes the batch that waits without a wait of the caller, and logs a failure that `flush` did not hold.
     */
    private flushInBackground(): void {
        this.flush().catch((error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);

            this.logger.error(
                `Failed to write the lines of the output of a container: ${message}`,
                error,
                RUNTIME_LOG_STORE_CONTEXT,
            );
        });
    }

    /**
     * Opens the deadline of the batch that waits, and keeps the one that already runs.
     */
    private scheduleFlush(): void {
        if (this.timer !== null) {
            return;
        }

        this.timer = setTimeout(() => {
            this.flushInBackground();
        }, RUNTIME_LOG_FLUSH_INTERVAL_MS);
        this.timer.unref();
    }

    /**
     * Drops the deadline of the batch that waits.
     */
    private clearTimer(): void {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
}
