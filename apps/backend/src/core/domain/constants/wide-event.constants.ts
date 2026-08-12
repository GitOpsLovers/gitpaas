/**
 * Name of the service every wide event is attributed to.
 */
export const WIDE_EVENT_SERVICE_NAME = 'gitpaas-backend';

/**
 * Value published as `service.version` when no build stamped one.
 */
export const WIDE_EVENT_UNKNOWN_VERSION = 'unknown';

/**
 * Name of the wide event covering one inbound HTTP request.
 */
export const HTTP_REQUEST_EVENT_NAME = 'http.request';

/**
 * Name of the wide event covering one background deployment run.
 */
export const DEPLOYMENT_RUN_EVENT_NAME = 'deployment.run';

/**
 * Rate recorded when the event was kept by a rule and not by chance.
 */
export const WIDE_EVENT_ALWAYS_KEPT_RATE = 1;

/**
 * Probability with which an ordinary fast, successful read is kept.
 */
export const WIDE_EVENT_DEFAULT_SAMPLE_RATE = 0.05;

/**
 * Duration, in milliseconds, above which a request counts as slow.
 */
export const WIDE_EVENT_DEFAULT_SLOW_MS = 1000;
