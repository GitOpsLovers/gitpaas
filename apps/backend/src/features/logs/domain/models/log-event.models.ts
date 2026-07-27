/**
 * Terminal status of a log stream.
 */
export type LogStatus = 'success' | 'failed';

/**
 * A single event in a log stream.
 */
export type LogEvent =
    | { type: 'line'; data: string }
    | { type: 'end'; status: LogStatus };
