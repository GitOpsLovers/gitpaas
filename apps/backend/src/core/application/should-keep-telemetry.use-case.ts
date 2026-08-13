import {
    DEPLOYMENT_RUN_EVENT_NAME,
    TELEMETRY_ALWAYS_KEPT_RATE,
    TELEMETRY_AUTH_ROUTE_PREFIX,
    TELEMETRY_KEPT_REASON_AUTH,
    TELEMETRY_KEPT_REASON_DEPLOYMENT,
    TELEMETRY_KEPT_REASON_ERROR,
    TELEMETRY_KEPT_REASON_MUTATION,
    TELEMETRY_KEPT_REASON_RANDOM,
    TELEMETRY_KEPT_REASON_SERVER_ERROR,
    TELEMETRY_KEPT_REASON_SLOW,
    TELEMETRY_KEPT_REASON_STREAM,
    TELEMETRY_READ_METHOD,
} from '../domain/constants/telemetry.constants';
import type {
    TelemetryEvent,
    TelemetryEventKeptReason,
    TelemetrySamplingDecision,
} from '../domain/models/telemetry.models';

/**
 * Status code from which a response counts as a server failure.
 */
const SERVER_ERROR_STATUS_CODE = 500;

/**
 * Resolves the deterministic reason the event is always worth keeping.
 *
 * @param event Completed telemetry event
 * @param slowMs Duration, in milliseconds, above which a request counts as slow
 *
 * @returns The first matching reason, or `undefined` when no rule applies
 */
function resolveDeterministicReason(event: TelemetryEvent, slowMs: number): TelemetryEventKeptReason | undefined {
    const statusCode = event['http.status_code'];
    const method = event['http.method'];
    const route = event['http.route'];
    const durationMs = event['http.duration_ms'];

    if (statusCode !== undefined && statusCode >= SERVER_ERROR_STATUS_CODE) {
        return TELEMETRY_KEPT_REASON_SERVER_ERROR;
    }

    if (event['error.code'] !== undefined) {
        return TELEMETRY_KEPT_REASON_ERROR;
    }

    if (method !== undefined && method !== TELEMETRY_READ_METHOD) {
        return TELEMETRY_KEPT_REASON_MUTATION;
    }

    if (route !== undefined && route.startsWith(TELEMETRY_AUTH_ROUTE_PREFIX)) {
        return TELEMETRY_KEPT_REASON_AUTH;
    }

    if (event['event.name'] === DEPLOYMENT_RUN_EVENT_NAME) {
        return TELEMETRY_KEPT_REASON_DEPLOYMENT;
    }

    // Streams are kept as such, so their long duration never reaches the slow rule
    if (event['http.sse'] === true) {
        return TELEMETRY_KEPT_REASON_STREAM;
    }

    if (durationMs !== undefined && durationMs > slowMs) {
        return TELEMETRY_KEPT_REASON_SLOW;
    }

    return undefined;
}

/**
 * Use case for deciding, once the outcome of the unit of work is known, whether its telemetry event is kept.
 *
 * @param event Completed telemetry event
 * @param slowMs Duration, in milliseconds, above which a request counts as slow
 * @param sampleRate Probability with which an ordinary fast, successful read is kept
 * @param randomValue Draw, between 0 inclusive and 1 exclusive, the sampled keep is decided with
 *
 * @returns The sampling decision, carrying the reason and the effective rate when the event is kept
 */
export function shouldKeepTelemetryUseCase(
    event: TelemetryEvent,
    slowMs: number,
    sampleRate: number,
    randomValue: number,
): TelemetrySamplingDecision {
    const reason = resolveDeterministicReason(event, slowMs);

    if (reason !== undefined) {
        return { kept: true, reason, rate: TELEMETRY_ALWAYS_KEPT_RATE };
    }

    if (randomValue < sampleRate) {
        return { kept: true, reason: TELEMETRY_KEPT_REASON_RANDOM, rate: sampleRate };
    }

    return { kept: false };
}
