# Logging plan — to-do list

For the detail behind each item, see [logging plan](./logging-plan.md).

All the paths are relative to `apps/backend/src`, if there is no other indication.

---

## Phase 0 — The rails

- [x] Create `core/domain/models/telemetry.models.ts` (new) with the flat `TelemetryEvent` type.
- [x] Create `core/domain/ports/telemetry-writer.port.ts` (new) with the `TelemetryWriter` port and its `emit` method.
- [x] Create `core/domain/constants/telemetry.constants.ts` (new) with the event names and the sampling constants.
- [x] Create `core/application/should-keep-telemetry.use-case.ts` (new) as a stub that keeps every event.
- [x] Create `core/infrastructure/telemetry/telemetry.context.ts` (new) with the `AsyncLocalStorage` store and the `runWithTelemetry` and `enrichTelemetry` functions.
- [x] Create `core/infrastructure/telemetry/stdout-telemetry-writer.adapter.ts` (new) that writes one JSON line to `process.stdout`.
- [x] Register the writer in the `providers` and the `exports` of `core/core.module.ts`.
- [x] Create `core/ui/middlewares/telemetry.middleware.ts` (new) that seeds the event and emits it on the response `finish` and `close` events.
- [x] Add a guard flag in `core/ui/middlewares/telemetry.middleware.ts` so one request emits one event only.
- [x] Register the middleware in `bootstrap.ts`, after `requestIdMiddleware` and before `helmet()`.
- [x] Add the service context, the correlation and the request fields to the emitted event.

## Phase 1 — Converge the errors

- [x] Add an `enrichTelemetry` call with the `error.*` fields in `core/ui/filters/all-exceptions.filter.ts`.
- [ ] Verify on the server that each failure gives one event with the error data and the request data.
- [x] Remove the `logException` method from `core/ui/filters/all-exceptions.filter.ts`.
- [x] Remove the `AppLogger` dependency from `core/ui/filters/all-exceptions.filter.ts`.
- [x] Move the logger assertions of `core/ui/filters/__tests__/all-exceptions.filter.spec.ts` to the enrichment call.

## Phase 2 — The actor and the business context

- [x] Add the `user.*` and `auth.*` fields from the `request.user` that `features/authentication/infrastructure/passport/jwt.strategy.ts` attaches.
- [x] Add the `project.*` fields in `features/projects/ui/controllers/projects.controller.ts` and `features/projects/ui/services/projects.service.ts`.
- [x] Add the `service.*` and `deployment.*` fields in `features/deployments/ui/controllers/deployments.controller.ts` and `features/deployments/ui/services/deployments.service.ts`.
- [x] Add the same enrichment to the remaining features, with the `projects` feature as the reference.

## Phase 3 — The outbound calls

- [ ] Add the `deps.github.*` counters in the private `run<T>()` helper of `features/source-control/infrastructure/github/github-source-control.adapter.ts`.
- [ ] Add the `deps.docker.*` counters in `core/infrastructure/docker/docker-container-runtime.adapter.ts` and `features/deployments/infrastructure/docker/docker-executor.adapter.ts`.
- [ ] Add the `deps.redis.*` counters in `features/logs/infrastructure/redis/redis-log-store.adapter.ts`.
- [ ] Remove the breadcrumb line `logger.log('Creating GitHub App installation client', …)` from `features/source-control/infrastructure/github/github-source-control.adapter.ts`.
- [ ] Remove the progress lines from `features/deployments/infrastructure/docker/docker-executor.adapter.ts`.
- [ ] Remove the progress and warning lines from `features/services/infrastructure/docker/docker-service-runtime-resources.adapter.ts`.

## Phase 4 — The background unit of work

- [ ] Add a nullable `parent.request_id` column to `features/deployments/infrastructure/database/db-deployment-queue-task.entity.ts`.
- [ ] Add the same column to a new numbered SQL file in `iac/production/migrations/`.
- [ ] Add the value to the queue task model and its transformer in `features/deployments/domain/models/queued-deployment-task.models.ts` and `features/deployments/infrastructure/database/db-deployment-queue-task.transformer.ts`.
- [ ] Add a `runWithTelemetry` scope for each task in the `run` method of `features/deployments/ui/services/deployment-runner.service.ts`.
- [ ] Add the outcome, the attempt, the duration and the `deps.*` counters to the `deployment.run` event.
- [ ] Remove the private `logFailure` method from `features/deployments/ui/services/deployment-runner.service.ts`.

## Phase 5 — Tail sampling

- [ ] Add the `TELEMETRY_SLOW_MS` and `TELEMETRY_SAMPLE_RATE` variables to `core/infrastructure/config/env-validation.config.ts`.
- [ ] Implement the keep rules in `core/application/should-keep-telemetry.use-case.ts`.
- [ ] Add the random 5 % rule for the remaining fast successful `GET` requests.
- [ ] Add the `sampling.kept_reason` and `sampling.rate` fields to the emitted event.
- [ ] Remove the SSE route from the slow-threshold rule, because the `http.sse` rule keeps it already.

## Phase 6 — The transport and the store

- [ ] Create the adapter of the selected store in `core/infrastructure/telemetry/` (new).
- [ ] Register the new adapter in `core/core.module.ts` in place of `stdout-telemetry-writer.adapter.ts`.
- [ ] Remove `core/infrastructure/telemetry/stdout-telemetry-writer.adapter.ts` when the new adapter operates.

---

## Blocked / decisions needed

- [ ] Decide the store and the query tool: stdout only, a `telemetry_events` `JSONB` table in the existing PostgreSQL, a columnar store, or a hosted vendor.
- [ ] Decide the source of `service.version`, because no `APP_VERSION` variable exists today in `core/infrastructure/config/env-validation.config.ts` or in the image build.
- [ ] Decide the retention period of the events.
- [x] Decide if the commit message of a deployment can be a field, or only the SHA and the branch. **Decided: only the SHA and the branch.**
- [ ] Decide if `GET /api/v1/server/readiness` stays in the random 5 % sample.
- [ ] Decide how the SSE route keeps its `AsyncLocalStorage` reference across the blocking Redis reads.
- [ ] Decide the maximum length of the `error.stack` field.
- [ ] Measure the cost of `AsyncLocalStorage` on the SSE route before phase 1.
