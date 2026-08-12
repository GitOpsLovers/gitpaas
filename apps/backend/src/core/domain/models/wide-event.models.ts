import { DEPLOYMENT_RUN_EVENT_NAME, HTTP_REQUEST_EVENT_NAME } from '../constants/wide-event.constants';

/**
 * Unit of work a wide event covers.
 */
type WideEventName = typeof HTTP_REQUEST_EVENT_NAME | typeof DEPLOYMENT_RUN_EVENT_NAME;

/**
 * Outcome of the authentication of a unit of work.
 */
type WideEventAuthOutcome = 'authenticated' | 'rejected' | 'anonymous';

/**
 * Reason the tail sampler kept a wide event.
 */
type WideEventKeptReason =
    | 'server_error'
    | 'error'
    | 'mutation'
    | 'auth'
    | 'deployment'
    | 'stream'
    | 'slow'
    | 'random';

/**
 * Outbound dependency the counters of a wide event are grouped by.
 */
type WideEventDependency = 'github' | 'docker' | 'redis' | 'postgres';

/**
 * Counters and timings accumulated for every outbound dependency of a unit of work.
 */
type WideEventDependencyFields = {
    [Name in WideEventDependency as `deps.${Name}.calls`]?: number;
} & {
    [Name in WideEventDependency as `deps.${Name}.duration_ms`]?: number;
} & {
    [Name in WideEventDependency as `deps.${Name}.errors`]?: number;
} & {
    [Name in WideEventDependency as `deps.${Name}.max_ms`]?: number;
};

/**
 * Service, correlation, request, actor, business, dependency, error and policy fields a unit of work accumulates.
 */
interface WideEventFields {
    /* Service and infrastructure context, present on every event */
    timestamp: string;
    'event.name': WideEventName;
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
    'auth.outcome'?: WideEventAuthOutcome;

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
    'sampling.kept_reason'?: WideEventKeptReason;
    'sampling.rate'?: number;
}

/**
 * One flat, structured record telling the full story of one unit of work.
 */
export type WideEvent = WideEventFields & WideEventDependencyFields;
