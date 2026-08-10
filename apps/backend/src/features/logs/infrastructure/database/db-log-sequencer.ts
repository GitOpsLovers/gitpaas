import type { LogsRepository } from '../../domain/repositories/logs.repository';

import { StreamState } from './db-log-stream-registry';

/**
 * Hands out the next sequence of a deployment's single sequence space, seeding
 * the counter from the highest stored sequence on first use.
 *
 * The sequence is the store's only ordering authority: one monotonic counter per
 * deployment, shared by the persisted rows and the live events.
 *
 * @param repository Logs repository
 * @param streamId Stream identifier
 * @param state Live state of the stream
 *
 * @returns Sequence assigned to the caller's event
 */
export async function nextSequence(
    repository: LogsRepository,
    streamId: string,
    state: StreamState,
): Promise<number> {
    state.seeded ??= repository.getMaxSeq(streamId);

    const highest = await state.seeded;

    state.nextSeq ??= highest + 1;

    const seq = state.nextSeq;

    state.nextSeq = seq + 1;

    return seq;
}
