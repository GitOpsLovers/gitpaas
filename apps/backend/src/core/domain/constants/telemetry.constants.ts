/**
 * Name of the service every telemetry event is attributed to.
 */
export const TELEMETRY_SERVICE_NAME = 'gitpaas-backend';

/**
 * Value published as `service.version` when no build stamped one.
 */
export const TELEMETRY_UNKNOWN_VERSION = 'unknown';

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
