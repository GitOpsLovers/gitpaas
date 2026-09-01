/**
 * The context every message of the log of the application of the runtime log store carries.
 */
export const RUNTIME_LOG_STORE_CONTEXT = 'RuntimeLogStore';

/**
 * The number of lines that waits before the store writes them, whatever their age is.
 */
export const RUNTIME_LOG_FLUSH_SIZE = 200;

/**
 * The number of milliseconds the oldest line that waits stays out of the database.
 */
export const RUNTIME_LOG_FLUSH_INTERVAL_MS = 5_000;
