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
- [x] Register the middleware in the `configure` method of `core/core.module.ts`, which applies `RequestIdMiddleware` and then `TelemetryMiddleware` to every route.
- [x] Add the service context, the correlation and the request fields to the emitted event.

## Phase 1 — Converge the errors

- [x] Add an `enrichTelemetry` call with the `error.*` fields in `core/ui/filters/all-exceptions.filter.ts`.
- [ ] Verify on the server that each failure gives one event with the error data and the request data.
- [x] Remove the `logException` method from `core/ui/filters/all-exceptions.filter.ts`.
- [x] Remove the `AppLogger` dependency from `core/ui/filters/all-exceptions.filter.ts`.
- [x] Move the logger assertions of `core/ui/filters/__tests__/all-exceptions.filter.spec.ts` to the enrichment call.

## Phase 2 — The actor and the business context

- [x] Add the `user.*` and `auth.*` fields in `features/authentication/ui/guards/jwt-auth.guard.ts`, from the `request.user` that the JWT strategy attaches.
- [x] Add the `project.*` fields in `features/projects/ui/controllers/projects.controller.ts` and `features/projects/ui/services/projects.service.ts`.
- [x] Add the `service.*` and `deployment.*` fields in `features/deployments/ui/controllers/deployments.controller.ts` and `features/deployments/ui/services/deployments.service.ts`.
- [x] Add the same enrichment to the controllers of the features that carry a business identifier — `services`, `networks`, `containers`, `logs` and `source-control` — with the `projects` feature as the reference.

## Phase 3 — The outbound calls

- [x] Add the `deps.github.*` counters in the private `run<T>()` helper of `features/source-control/infrastructure/github/github-source-control.adapter.ts`.
- [x] Add the `deps.docker.*` counters in `core/infrastructure/docker/docker-container-runtime.adapter.ts` and `features/deployments/infrastructure/docker/docker-executor.adapter.ts`.
- [x] Add the `deps.redis.*` counters in `features/logs/infrastructure/redis/redis-log-store.adapter.ts`.
- [x] Remove the breadcrumb line `logger.log('Creating GitHub App installation client', …)` from `features/source-control/infrastructure/github/github-source-control.adapter.ts`.
- [x] Remove the progress lines from `features/deployments/infrastructure/docker/docker-executor.adapter.ts`.
- [x] Remove the progress and warning lines from `features/services/infrastructure/docker/docker-service-runtime-resources.adapter.ts`.

## Phase 4 — The background unit of work

- [x] Add a nullable `parent.request_id` column to `features/deployments/infrastructure/database/db-deployment-queue-task.entity.ts`.
- [x] Add the same column to a new numbered SQL file in `iac/production/migrations/`.
- [x] Add the value to the queue task model and its transformer in `features/deployments/domain/models/queued-deployment-task.models.ts` and `features/deployments/infrastructure/database/db-deployment-queue-task.transformer.ts`.
- [x] Add a `runWithTelemetry` scope for each task in the `run` method of `features/deployments/ui/services/deployment-runner.service.ts`.
- [x] Add the outcome, the attempt, the duration and the `deps.*` counters to the `deployment.run` event.
- [x] Remove the private `logFailure` method from `features/deployments/ui/services/deployment-runner.service.ts`.

## Phase 5 — Tail sampling

- [x] Add the `TELEMETRY_SLOW_MS` and `TELEMETRY_SAMPLE_RATE` variables to `core/infrastructure/config/env-validation.config.ts`.
- [x] Implement the keep rules in `core/application/should-keep-telemetry.use-case.ts`.
- [x] Add the random 5 % rule for the remaining fast successful `GET` requests.
- [x] Add the `sampling.kept_reason` and `sampling.rate` fields to the emitted event.
- [x] Remove the SSE route from the slow-threshold rule, because the `http.sse` rule keeps it already.

## Phase 6 — Complete the coverage of the event

> The transport is closed. `StdoutTelemetryWriterAdapter` writes one JSON line for each event, and the rotation
> of the Docker log driver is the retention. There is no persistent store in the plan.
> What is open is the **coverage**: some paths of the application still emit an event that has empty fields.

- [ ] Add the enrichment to `features/authentication/ui/controllers/authentication.controller.ts` and `features/authentication/ui/services/authentication.service.ts`, so a successful login gives a `user.id` and an `auth.outcome`.
- [ ] Add the enrichment to `features/users/ui/services/users.service.ts`, which is the only UI layer of that feature (it has no controller), for the operations that a request reaches.
- [ ] Decide if `features/server` needs the enrichment, and add it or record the decision.
- [ ] Move the enrichment of `logs`, `networks` and `containers` into their UI services, or confirm that the enrichment of their controllers is sufficient.
- [ ] Record the `deps.postgres.*` counters with `recordDependencyCall('postgres', …)`, because no code calls them today.
- [ ] Cap `error.stack` at `TELEMETRY_MAX_STACK_LENGTH` (4096) characters on the `deployment.run` path of `features/deployments/ui/services/deployment-runner.service.ts`, as `core/ui/filters/all-exceptions.filter.ts` does on the HTTP path.

---

## Blocked / decisions needed

- [x] Decide the store and the query tool: stdout only, a `telemetry_events` `JSONB` table in the existing PostgreSQL, a columnar store, or a hosted vendor. **Decided: stdout only. `StdoutTelemetryWriterAdapter` is the definitive transport, and the project adds no persistent store.**
- [x] Decide the source of `service.version`, because no `APP_VERSION` variable exists today in `core/infrastructure/config/env-validation.config.ts` or in the image build. **Decided: the `version` of the root `package.json`, stamped as `APP_VERSION` by the production image.**
- [x] Decide the retention period of the events. **Decided: the rotation of the Docker log driver is the retention.**
- [x] Decide if the commit message of a deployment can be a field, or only the SHA and the branch. **Decided: only the SHA and the branch.**
- [x] Decide if `GET /api/v1/server/readiness` stays in the random 5 % sample. **Decided: it stays in the random 5 % sample.**
- [ ] Decide how the SSE route keeps its `AsyncLocalStorage` reference across the blocking Redis reads.
- [x] Decide the maximum length of the `error.stack` field. **Decided: 4096 characters for the whole chain, with the first characters kept.**
- [ ] Measure the cost of `AsyncLocalStorage` on the SSE route before phase 1.
