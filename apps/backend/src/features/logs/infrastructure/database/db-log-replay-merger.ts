import { Subscriber } from 'rxjs';

import { LogEvent } from '../../domain/models/log-event.models';
import type { LogsRepository } from '../../domain/repositories/logs.repository';

import { SequencedLogEvent, toLogEvent, toSequencedLogEvent } from './db-log-store.transformer';
import { StreamState } from './db-log-stream-registry';

/**
 * Feeds one subscriber the stream's stored entries followed by its live ones,
 * completing on the terminal `end` event.
 *
 * Serves a subscriber *replay then live*: it attaches to the live channel first,
 * then reads the stored rows plus the still-unwritten batch, and deduplicates
 * the overlap by sequence — so the hand-off has neither a gap nor a duplicate.
 *
 * @param repository Logs repository
 * @param streamId Stream identifier
 * @param state Live state of the stream
 * @param subscriber Subscriber to feed
 *
 * @returns Teardown detaching the subscriber from the live channel
 */
export function mergeReplayWithLive(
    repository: LogsRepository,
    streamId: string,
    state: StreamState,
    subscriber: Subscriber<LogEvent>,
): () => void {
    let replaying = true;
    let ended = false;
    let liveEnded = false;
    let maxSeq = 0;
    const buffered: SequencedLogEvent[] = [];

    const emit = (event: SequencedLogEvent): void => {
        // Drop anything already emitted (replay/live overlap) or out of order.
        if (ended || event.seq <= maxSeq) {
            return;
        }

        maxSeq = event.seq;

        const logEvent = toLogEvent(event);

        subscriber.next(logEvent);

        if (logEvent.type === 'end') {
            ended = true;
            subscriber.complete();
        }
    };

    // Attach live *before* reading history: anything published from now on is
    // held back until the replay drains, so no event can fall between them.
    const live = state.events$.subscribe({
        next: (event: SequencedLogEvent) => {
            if (replaying) {
                buffered.push(event);

                return;
            }

            emit(event);
        },
        error: (error: unknown) => { subscriber.error(error); },
        complete: () => {
            liveEnded = true;

            if (!replaying && !ended) {
                subscriber.complete();
            }
        },
    });

    // Snapshot the not-yet-durable events before querying: rows that become
    // durable during the query are simply seen twice and deduplicated.
    const unflushed = [...state.writing, ...state.pending];

    repository
        .getAllByDeployment(streamId)
        .then((entries) => {
            entries.map(toSequencedLogEvent).forEach(emit);
            unflushed.forEach(emit);

            replaying = false;
            buffered.forEach(emit);
            buffered.length = 0;

            if (liveEnded && !ended) {
                subscriber.complete();
            }
        })
        .catch((error: unknown) => { subscriber.error(error); });

    return () => { live.unsubscribe(); };
}
