/**
 * Logging context shared by the log store and every collaborator it composes, so
 * the whole store reports under a single name.
 */
export const LOG_STORE_CONTEXT = 'RedisLogStoreAdapter';

/** Prefix of the Redis stream key that holds one deployment's log. */
export const LOG_STREAM_KEY_PREFIX = 'logs:';

/** Suffix of the key holding the lease a stream's producer keeps alive. */
export const LOG_STREAM_PRODUCER_KEY_SUFFIX = ':producer';

/** Stream identifier a reader starts from, so it gets the history before the live tail. */
export const LOG_STREAM_START_ID = '0';

/**
 * Longest time one blocking read waits for a new entry before it returns empty.
 */
export const LOG_STREAM_BLOCK_MS = 2000;

/** Entries one blocking read may return at once. */
export const LOG_STREAM_READ_COUNT = 200;

/**
 * Consecutive idle rounds with no producer lease a reader tolerates before it
 * closes the stream.
 */
export const LOG_STREAM_IDLE_ROUNDS_BEFORE_CLOSE = 2;

/**
 * Grace period the archived stream stays in Redis, in seconds.
 *
 * The whole log is already in PostgreSQL by then; the delay only lets a slow
 * subscriber finish reading the tail it is on.
 */
export const LOG_STREAM_GRACE_SECONDS = 60;

/**
 * How long the producer's lease survives without a refresh, in seconds.
 */
export const LOG_STREAM_PRODUCER_LEASE_SECONDS = 300;
