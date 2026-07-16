import { LogEvent } from '../../domain/models/log-event.model';

/** A stored/published event carries a monotonic sequence used to dedupe replay vs. live. */
export type StoredEvent = { seq: number } & LogEvent;

/**
 * Maps a Redis-stored event into its domain log event, dropping the transport
 * sequence used only for replay/live deduplication.
 *
 * @param event Stored event read from Redis
 *
 * @returns Domain log event
 */
export function toLogEvent(event: StoredEvent): LogEvent {
    if (event.type === 'end') {
        return { type: 'end', status: event.status };
    }

    return { type: 'line', data: event.data };
}
