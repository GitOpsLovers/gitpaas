import { Observable } from 'rxjs';

import { LogEvent, LogStatus } from '../models/log-event.model';

/**
 * Store for real-time log streams.
 *
 * Buffers captured output so it can be replayed to a viewer that connects late,
 * and fans out live output to viewers watching an in-progress stream.
 */
export interface LogStoreRepository {
    /**
     * Append a captured log line to a stream's buffer and publish it live.
     *
     * @param streamId Stream identifier
     * @param line Raw log line (without trailing newline)
     */
    append: (streamId: string, line: string) => Promise<void>;

    /**
     * Mark a stream's log as finished, publishing the terminal status.
     *
     * @param streamId Stream identifier
     * @param status Terminal status of the stream
     */
    complete: (streamId: string, status: LogStatus) => Promise<void>;

    /**
     * Stream a log: buffered lines first, then live lines, completing
     * when the stream ends.
     *
     * @param streamId Stream identifier
     *
     * @returns Cold observable that starts streaming on subscription and tears down
     * its resources on unsubscribe
     */
    stream: (streamId: string) => Observable<LogEvent>;
}
