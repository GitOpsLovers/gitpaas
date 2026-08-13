import { DEPLOYMENT_RUN_EVENT_NAME, HTTP_REQUEST_EVENT_NAME } from '../constants/telemetry.constants';

/**
 * Unit of work a telemetry event covers.
 */
type TelemetryEventName = typeof HTTP_REQUEST_EVENT_NAME | typeof DEPLOYMENT_RUN_EVENT_NAME;

/**
 * Outcome of the authentication of a unit of work.
 */
type TelemetryEventAuthOutcome = 'authenticated' | 'rejected' | 'anonymous';

/**
 * Reason the tail sampler kept a telemetry event.
 */
type TelemetryEventKeptReason =
    | 'server_error'
    | 'error'
    | 'mutation'
    | 'auth'
    | 'deployment'
    | 'stream'
    | 'slow'
    | 'random';

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
 * Outbound dependency the counters of a telemetry event are grouped by.
 */
export type TelemetryEventDependency = 'github' | 'docker' | 'redis' | 'postgres';

/**
 * One flat, structured record telling the full story of one unit of work.
 */
export type TelemetryEvent = TelemetryEventFields & TelemetryEventDependencyFields;
