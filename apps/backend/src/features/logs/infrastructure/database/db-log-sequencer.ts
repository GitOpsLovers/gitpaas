import { Inject, Injectable } from '@nestjs/common';

import type { LogsRepository } from '../../domain/repositories/logs.repository';

import { StreamState } from './db-log-stream-registry';
import { DatabaseLogsRepository } from './db-logs.repository';

/**
 * Sequence authority of a deployment's log stream.
 *
 * Hands out one monotonic counter per deployment, seeded from the highest stored
 * sequence, so persisted rows and live events share a single ordering.
 */
@Injectable()
export class LogSequencer {
    constructor(
        @Inject(DatabaseLogsRepository)
        private readonly repository: LogsRepository,
    ) {}

    /**
     * Hands out the next sequence of a deployment's single sequence space,
     * seeding the counter from the highest stored sequence on first use.
     *
     * @param streamId Stream identifier
     * @param state Live state of the stream
     *
     * @returns Sequence assigned to the caller's event
     */
    public async next(streamId: string, state: StreamState): Promise<number> {
        state.seeded ??= this.repository.getMaxSeq(streamId);

        const highest = await state.seeded;

        state.nextSeq ??= highest + 1;

        const seq = state.nextSeq;

        state.nextSeq = seq + 1;

        return seq;
    }
}
