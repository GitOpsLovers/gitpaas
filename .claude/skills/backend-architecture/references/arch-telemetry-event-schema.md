# The schema of the telemetry event

`TelemetryEvent` in `core/domain/models/telemetry.models.ts` is the authoritative schema: it declares every field the backend may write, and a field with no place in it must be added there first, per the rule for contributors below.

## The fields

The keys are dotted and `snake_case`, and a field is present only when the work touches it:

- Service identity: `service.name`, `service.version`, `service.env`, `host.name`, `process.pid`.
- Correlation: `trace.id`, `request.id`, `task.id`, `parent.request_id`.
- `http.*`: the low-cardinality `route`, the `path`, the `query_keys` **names** only, `status_code`, `duration_ms`, `sse`, `client_aborted`.
- The actor: `user.*`, `auth.*`.
- The business identifiers: `project.*`, `service.id`, `deployment.*`, `docker.project`.
- `deps.*`, `error.*` and `sampling.*`.

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

Add a field, and not a text line; if the value has no field, add it to `TelemetryEvent` first. `AppLogger` stays in the three places that have no event to enrich: the process handlers and the bootstrap failure of `src/main.ts`, the lifecycle messages (for example the shutdown warning of `RedisConnection`), and the seed of the development administrator in the `users` service.
