/**
 * A single event in a real-time log stream.
 *
 * - `line`: one line of output.
 * - `end`: the stream has finished; carries its terminal status.
 * - `error`: the stream could not be read to its end; carries a code and a safe message.
 */
export type LogEvent =
    | { type: 'line'; data: string }
    | { type: 'end'; status: 'success' | 'failed' }
    | { type: 'error'; code: string; message: string };
