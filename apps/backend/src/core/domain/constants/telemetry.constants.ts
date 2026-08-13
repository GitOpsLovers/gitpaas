/**
 * Name of the service every telemetry event is attributed to.
 */
export const TELEMETRY_SERVICE_NAME = 'gitpaas-backend';

/**
 * Value published as `service.version` when no build stamped one.
 */
export const TELEMETRY_UNKNOWN_VERSION = 'unknown';

/**
 * Maximum length, in characters, of the stack published as `error.stack`.
 */
export const TELEMETRY_MAX_STACK_LENGTH = 4096;

/**
 * Name of the telemetry event covering one inbound HTTP request.
 */
export const HTTP_REQUEST_EVENT_NAME = 'http.request';

/**
 * Name of the telemetry event covering one background deployment run.
 */
export const DEPLOYMENT_RUN_EVENT_NAME = 'deployment.run';

/**
 * Rate recorded when the event was kept by a rule and not by chance.
 */
export const TELEMETRY_ALWAYS_KEPT_RATE = 1;

/**
 * Probability with which an ordinary fast, successful read is kept.
 */
export const TELEMETRY_DEFAULT_SAMPLE_RATE = 0.05;

/**
 * Duration, in milliseconds, above which a request counts as slow.
 */
export const TELEMETRY_DEFAULT_SLOW_MS = 1000;

/**
 * HTTP method of the reads the tail sampler is allowed to drop.
 */
export const TELEMETRY_READ_METHOD = 'GET';

/**
 * Prefix of the routes served by the authentication feature.
 */
export const TELEMETRY_AUTH_ROUTE_PREFIX = '/api/v1/auth';

/**
 * Reason recorded when the request failed on the server side.
 */
export const TELEMETRY_KEPT_REASON_SERVER_ERROR = 'server_error';

/**
 * Reason recorded when the unit of work carries an error code.
 */
export const TELEMETRY_KEPT_REASON_ERROR = 'error';

/**
 * Reason recorded when the request changed state.
 */
export const TELEMETRY_KEPT_REASON_MUTATION = 'mutation';

/**
 * Reason recorded when the request hit the authentication feature.
 */
export const TELEMETRY_KEPT_REASON_AUTH = 'auth';

/**
 * Reason recorded when the unit of work is a deployment run.
 */
export const TELEMETRY_KEPT_REASON_DEPLOYMENT = 'deployment';

/**
 * Reason recorded when the request served a stream.
 */
export const TELEMETRY_KEPT_REASON_STREAM = 'stream';

/**
 * Reason recorded when the request took longer than the slow threshold.
 */
export const TELEMETRY_KEPT_REASON_SLOW = 'slow';

/**
 * Reason recorded when an ordinary fast, successful read was kept by chance.
 */
export const TELEMETRY_KEPT_REASON_RANDOM = 'random';
