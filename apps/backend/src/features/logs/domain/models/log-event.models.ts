/**
 * Terminal status of a log stream.
 */
export type LogStatus = 'success' | 'failed';

/**
 * Code published by the failure event when a stream cannot be read.
 */
export const LOG_STREAM_UNAVAILABLE_CODE = 'LOG_STREAM_UNAVAILABLE';

/**
 * Message published by the failure event when a stream cannot be read.
 */
export const LOG_STREAM_UNAVAILABLE_MESSAGE = 'The deployment log could not be streamed. Try again in a moment.';

/**
 * One line of output captured from a run.
 */
export interface LogLineEvent {
    type: 'line';
    data: string;
}

/**
 * Terminal event of a run, carrying how the run ended.
 */
export interface LogEndEvent {
    type: 'end';
    status: LogStatus;
}

/**
 * Failure event: the stream could not be read to its end.
 */
export interface LogErrorEvent {
    type: 'error';
    code: string;
    message: string;
}

/**
 * A log event that belongs to the run itself.
 */
export type StoredLogEvent = LogLineEvent | LogEndEvent;

/**
 * A single event in a log stream, as a subscriber sees it.
 */
export type LogEvent = StoredLogEvent | LogErrorEvent;
