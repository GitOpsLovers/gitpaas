/**
 * Terminal status of a log stream.
 */
export type LogStatus = 'success' | 'failed';

/**
 * Code published by the failure event when a stream cannot be read.
 *
 * It follows the same vocabulary as the `code` of the HTTP error envelope, so a
 * client branches on the code alone instead of matching prose.
 */
export const LOG_STREAM_UNAVAILABLE_CODE = 'LOG_STREAM_UNAVAILABLE';

/**
 * Message published by the failure event when a stream cannot be read.
 *
 * It never carries the underlying failure: the driver message stays in the
 * server log, exactly like the HTTP envelope's generic 500 message.
 */
export const LOG_STREAM_UNAVAILABLE_MESSAGE = 'The deployment log could not be streamed. Try again in a moment.';

/**
 * One line of output captured from a run.
 */
export type LogLineEvent = { type: 'line'; data: string };

/**
 * Terminal event of a run, carrying how the run ended.
 */
export type LogEndEvent = { type: 'end'; status: LogStatus };

/**
 * Failure event: the stream could not be read to its end.
 *
 * It is emitted to the subscriber only — it is never appended to the stream nor
 * archived — and the stream completes right after it, so an `EventSource` client
 * learns *why* the feed stopped instead of seeing the connection drop.
 */
export type LogErrorEvent = { type: 'error'; code: string; message: string };

/**
 * A log event that belongs to the run itself, and is therefore the only kind
 * that is written to the Redis stream and archived in PostgreSQL.
 */
export type StoredLogEvent = LogLineEvent | LogEndEvent;

/**
 * A single event in a log stream, as a subscriber sees it.
 */
export type LogEvent = StoredLogEvent | LogErrorEvent;
