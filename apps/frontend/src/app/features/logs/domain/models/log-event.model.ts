/**
 * A single event in a real-time log stream.
 *
 * - `line`: one line of output.
 * - `end`: the stream has finished; carries its terminal status.
 */
export type LogEvent =
    | { type: 'line'; data: string }
    | { type: 'end'; status: 'success' | 'failed' };
