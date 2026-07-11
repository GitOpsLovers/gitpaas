/**
 * Terminal status of a log stream.
 */
export type LogStatus = 'success' | 'failed';

/**
 * A single event in a log stream.
 *
 * - `line`: one captured line of output.
 * - `end`: the stream has finished; carries its terminal status.
 */
export type LogEvent =
    | { type: 'line'; data: string }
    | { type: 'end'; status: LogStatus };
