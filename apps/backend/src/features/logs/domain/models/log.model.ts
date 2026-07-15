import { LogStatus } from './log-event.model';

/**
 * Kind of a persisted log row.
 *
 * - `line`: one captured line of output (`content` set, `status` null).
 * - `end`: the terminal marker of a stream (`status` set, `content` null).
 */
export type LogType = 'line' | 'end';

/**
 * A single persisted entry of a deployment's log stream.
 *
 * Rows faithfully mirror the live {@link import('./log-event.model').LogEvent}
 * stream: each captured line becomes a `line` row and the stream's terminal
 * status becomes a final `end` row, ordered by `seq`.
 */
export interface Log {
    id: string;
    deploymentId: string;
    /** Monotonic index of this entry within its deployment's stream, starting at 1. */
    seq: number;
    type: LogType;
    /** Line text for a `line` entry, or `null` for an `end` entry. */
    content: string | null;
    /** Terminal status for an `end` entry, or `null` for a `line` entry. */
    status: LogStatus | null;
    createdAt: Date;
}
