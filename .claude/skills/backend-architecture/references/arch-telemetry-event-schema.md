# The schema of the telemetry event

`TelemetryEvent` in `core/domain/models/telemetry.models.ts` is the authoritative schema: it declares every field the backend may write, and a field with no place in it must be added there first, per the rule for contributors below. Read that file for the full list of fields; do not copy it here, because it goes stale.

## The groups

The keys are dotted and `snake_case`, and a field is present only when the work touches it. `TelemetryEventFields` groups them as: service and infrastructure context, correlation, background task details, request details, actor context, the audit of a sensitive action, business context, integration context beyond the generic dependency counters, error information, and policy and sampling.

```json
{ "timestamp": "2026-02-11T09:14:22.481Z", "event.name": "http.request",
  "service.name": "gitpaas-backend", "service.version": "1.4.0", "service.env": "production",
  "trace.id": "9d1f…", "request.id": "9d1f…",
  "http.method": "POST", "http.route": "/api/v1/deployments", "http.status_code": 201,
  "http.duration_ms": 143.7, "auth.outcome": "authenticated", "user.id": "5c0e…",
  "project.id": "a71c…", "deployment.id": "3ee8…", "deployment.branch": "main",
  "deps.postgres.calls": 6, "deps.postgres.duration_ms": 21.4,
  "sampling.kept_reason": "mutation", "sampling.rate": 1 }
```

## The rule for contributors

> **Inside a unit of work, enrich the event. Outside a unit of work, use `AppLogger`.**

Add a field, and not a text line; if the value has no field, add it to `TelemetryEvent` first.
`AppLogger` (injected as `NestLoggerAdapter`) stays outside a telemetry scope, in four kinds of
place: the process handlers and the bootstrap failure of `src/main.ts`; a message of the
lifecycle, such as `onModuleInit`/`onModuleDestroy` of `deployment-runner.service.ts` or the
shutdown warning of `redis.connection.ts`; a scheduled job, such as the `*.job.ts` files of
`features/server/ui/jobs/` and `features/logs/ui/jobs/`; and an adapter that reports the failure
of a vendor it wraps, such as `docker-container-runtime.adapter.ts`,
`traefik-reverse-proxy.adapter.ts`, `cloudflare-ranges.adapter.ts` and
`node-dns-resolver.adapter.ts`.
