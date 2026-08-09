/** Lines buffered before the batch is written out, whatever the timer says. */
export const BATCH_SIZE = 100;

/** Upper bound on how long a captured line may sit in memory before it is durable. */
export const FLUSH_INTERVAL_MS = 250;

/** Milliseconds in an hour, used to turn the configured retention into an instant. */
export const HOUR_IN_MS = 60 * 60 * 1000;

/**
 * Logging context shared by the log store and every collaborator it composes, so
 * the whole store reports under a single name.
 */
export const LOG_STORE_CONTEXT = 'DatabaseLogStoreAdapter';
