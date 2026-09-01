import {
    DEPLOYMENT_RUN_EVENT_NAME,
    HTTP_REQUEST_EVENT_NAME,
    TELEMETRY_KEPT_REASON_AUTH,
    TELEMETRY_KEPT_REASON_DEPLOYMENT,
    TELEMETRY_KEPT_REASON_ERROR,
    TELEMETRY_KEPT_REASON_MUTATION,
    TELEMETRY_KEPT_REASON_RANDOM,
    TELEMETRY_KEPT_REASON_SERVER_ERROR,
    TELEMETRY_KEPT_REASON_SLOW,
    TELEMETRY_KEPT_REASON_STREAM,
} from '../constants/telemetry.constants';

/**
 * Unit of work a telemetry event covers.
 */
type TelemetryEventName = typeof HTTP_REQUEST_EVENT_NAME | typeof DEPLOYMENT_RUN_EVENT_NAME;

/**
 * Outcome of the authentication of a unit of work.
 */
type TelemetryEventAuthOutcome = 'authenticated' | 'rejected' | 'anonymous';

/**
 * Counters and timings accumulated for every outbound dependency of a unit of work.
 */
type TelemetryEventDependencyFields = {
    [Name in TelemetryEventDependency as `deps.${Name}.calls`]?: number;
} & {
    [Name in TelemetryEventDependency as `deps.${Name}.duration_ms`]?: number;
} & {
    [Name in TelemetryEventDependency as `deps.${Name}.errors`]?: number;
} & {
    [Name in TelemetryEventDependency as `deps.${Name}.max_ms`]?: number;
};

/**
 * Service, correlation, request, actor, business, dependency, error and policy fields a unit of work accumulates.
 */
interface TelemetryEventFields {
    /* Service and infrastructure context, present on every event */
    timestamp: string;
    'event.name': TelemetryEventName;
    'service.name': string;
    'service.version': string;
    'service.env': string;
    'host.name': string;
    'process.pid': number;
    'trace.id': string;

    /* Correlation */
    'request.id'?: string;
    'task.id'?: string;
    'parent.request_id'?: string;

    /* Background task details */
    'task.duration_ms'?: number;

    /* Request details */
    'http.method'?: string;
    'http.route'?: string;
    'http.path'?: string;
    'http.query_keys'?: string[];
    'http.status_code'?: number;
    'http.duration_ms'?: number;
    'http.request_bytes'?: number;
    'http.user_agent'?: string;
    'http.sse'?: boolean;
    'http.client_aborted'?: boolean;

    /* Actor context */
    'user.id'?: string;
    'user.role'?: string;
    'auth.public_route'?: boolean;
    'auth.outcome'?: TelemetryEventAuthOutcome;

    /* Business context */
    'namespace.id'?: string;
    'provider.id'?: string;
    'provider.registration.state'?: string;
    'project.id'?: string;
    'service.id'?: string;
    'service.slug'?: string;
    'deployment.id'?: string;
    'deployment.status'?: string;
    'deployment.branch'?: string;
    'deployment.commit'?: string;
    'deployment.trigger'?: string;
    'deployment.compose_path'?: string;
    'deployment.attempt'?: number;
    'deployment.log_lines'?: number;
    'container.id'?: string;
    'container.log_lines'?: number;
    'docker.project'?: string;

    /* Integration context, beyond the generic dependency counters */
    'deps.github.repository_id'?: number;
    'deps.github.ref'?: string;
    'deps.github.archive_bytes'?: number;

    /* Error information */
    'error.type'?: string;
    'error.code'?: string;
    'error.message'?: string;
    'error.cause_chain'?: string[];
    'error.stack'?: string;
    'error.retriable'?: boolean;

    /* Policy and sampling */
    'policy.throttler'?: string;
    'policy.logs_max_lines'?: number;
    'sampling.kept_reason'?: TelemetryEventKeptReason;
    'sampling.rate'?: number;
}

/**
 * Reason the tail sampler kept a telemetry event.
 */
export type TelemetryEventKeptReason =
    | typeof TELEMETRY_KEPT_REASON_SERVER_ERROR
    | typeof TELEMETRY_KEPT_REASON_ERROR
    | typeof TELEMETRY_KEPT_REASON_MUTATION
    | typeof TELEMETRY_KEPT_REASON_AUTH
    | typeof TELEMETRY_KEPT_REASON_DEPLOYMENT
    | typeof TELEMETRY_KEPT_REASON_STREAM
    | typeof TELEMETRY_KEPT_REASON_SLOW
    | typeof TELEMETRY_KEPT_REASON_RANDOM;

/**
 * Decision the tail sampler took on one completed telemetry event.
 */
export type TelemetrySamplingDecision =
    | { kept: true; reason: TelemetryEventKeptReason; rate: number }
    | { kept: false };

/**
 * Outbound dependency the counters of a telemetry event are grouped by.
 */
export type TelemetryEventDependency = 'github' | 'docker' | 'redis' | 'postgres';

/**
 * One flat, structured record telling the full story of one unit of work.
 */
export type TelemetryEvent = TelemetryEventFields & TelemetryEventDependencyFields;
