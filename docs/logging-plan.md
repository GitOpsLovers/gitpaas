# Logging plan — wide events for the backend

This document is an **implementation proposal**. It gives a plan to move the logging of `apps/backend`
from single-line text messages to **wide events**. Nothing in this document is implemented yet.

For the layers and the conventions that the plan obeys, see [backend architecture](./backend-architecture.md).
For the domain words that the event schema uses, see [backend business](./backend-business.md).

---

## 1. Context and problem

### What the backend does today

The backend has one logging port and one adapter:

- `core/domain/ports/app-logger.port.ts` gives the `AppLogger` port with four methods: `debug`, `log`, `warn`
  and `error`. Each method accepts a **`message: string`** and an optional **`context: string`**.
- `core/infrastructure/logging/nest-logger.adapter.ts` gives `NestLoggerAdapter`, which sends the message
  to the NestJS `Logger`. `CoreModule` declares it as a global provider, so each consumer injects the
  concrete class and gives it the type of the port.

Four groups of files write log messages:

1. **The global exception filter.** `core/ui/filters/all-exceptions.filter.ts` writes the only log line of a
   failed request. Its `logException` method writes an `error` line with the stack chain for a 5xx, and a
   `warn` line with no stack for a 4xx. Both lines start with `[<requestId>]`.
2. **The process handlers.** `src/main.ts` logs `unhandledRejection`, `uncaughtException` and a bootstrap failure.
3. **The infrastructure adapters.** The Docker, GitHub, Redis and log-store adapters write progress lines and
   best-effort failure lines, for example in `core/infrastructure/docker/docker-container-runtime.adapter.ts`,
   `features/source-control/infrastructure/github/github-source-control.adapter.ts` and
   `features/logs/infrastructure/redis/redis-log-store.adapter.ts`.
4. **The background runner.** `features/deployments/ui/services/deployment-runner.service.ts` logs each
   unrecoverable failure of a queued task through its private `logFailure` method.

There is a correlation id. `core/ui/middlewares/request-id.middleware.ts` runs before all the other
middleware (`app.use(requestIdMiddleware)` in `src/bootstrap.ts`), resolves the `X-Request-Id` header or makes a
UUID, writes the value back on the request headers and sets the response header.

There is **no interceptor** in the application today. A search for `NestInterceptor` in `apps/backend/src`
gives no result. Thus there is no per-request hook that sees the start and the end of a request.

### Why this is not sufficient

- **A successful request writes nothing.** The filter is the only request-scoped writer, and it runs only on a
  failure. Thus a slow `POST /api/v1/deployments` that succeeds leaves no record at all. You cannot answer
  "how long did that request take" or "who triggered that deployment" from the log.
- **The context is dispersed.** One failed deployment can write a line from the GitHub adapter, some lines from
  the Docker executor, one line from the runner and one line from the filter. Each line is a different record.
  Only the request id connects the HTTP lines, and the background lines have **no** request id at all, because
  the runner operates outside the request.
- **The message is a string.** The port accepts a message and a context, and nothing else. Thus each value
  (a deployment id, a service slug, a duration) is formatted into prose, for example
  `` `Deployment runner crashed for ${task.deploymentId}` ``. To find the events of one deployment you must do a
  substring search, and you cannot filter, group or compare.
- **You cannot correlate.** "Show each failed deployment of the services of project X, in the last day, with the
  GitHub latency of each one" is not a query that a text log can answer.
- **The volume is not controlled.** The adapters write a line for each Docker build, each pull and each start.
  The quantity of lines increases with the work, and almost all the lines are of no use.

These are the four problems that the wide-event philosophy names: **volume**, **context**, **search** and a
format that is optimized to write and not to query.

> **The `logs` feature is not application logging.** `features/logs/` and its `LogStore` port keep the **output
> of a deployment** for the user, in Redis and then in PostgreSQL. It is a product capability, not observability.
> This plan does not change it and does not reuse it. See section 4.4.

---

## 2. Proposal summary

Replace the dispersed text lines with **one wide event for each unit of work**.

A **GitPaaS wide event** is one flat, structured record, with many fields, that gives the full story of one unit
of work in one row. The backend has two units of work:

| Unit of work        | `event.name`     | Starts when                             | Ends when                       |
|---------------------|------------------|-----------------------------------------|---------------------------------|
| One HTTP request    | `http.request`   | The request enters the middleware chain | The response finishes or closes |
| One deployment run  | `deployment.run` | The runner takes a task from the queue  | The task completes or fails     |

The rules are:

1. **One event for each unit of work, and one only.** Not one for each step.
2. **The event is made at the start**, is **enriched** through all the layers while the work progresses, and is
   **emitted one time at the end**, when the outcome is known.
3. **The fields are values, not prose.** A duration is a number, an identifier is an identifier.
4. **High cardinality is welcome.** A deployment id, a commit SHA and a user id belong in the event.
5. **The decision to keep the event is taken at the end** (tail sampling), from the outcome. See section 5.

Structured logging is not the same thing as a wide event. JSON is only the format. The change is that
**one request gives one record**, and not twenty.

---

## 3. Event schema

The fields use a dotted, `snake_case` namespace. Each field below maps to data that the application has today.
The event is flat: `http.status_code` is a key, and not a nested object.

### 3.1 Service and infrastructure context

Present on every event.

| Field                | Source                                                              |
|----------------------|---------------------------------------------------------------------|
| `timestamp`          | ISO 8601 instant of the emission                                     |
| `event.name`         | `http.request` or `deployment.run`                                   |
| `service.name`       | Constant, `gitpaas-backend`                                          |
| `service.version`    | New `APP_VERSION` environment variable (see section 7)               |
| `service.env`        | `NODE_ENV`, already validated in `core/infrastructure/config/env-validation.config.ts` |
| `host.name`          | `os.hostname()`, which is the container id on the server             |
| `process.pid`        | `process.pid`                                                        |
| `trace.id`           | The correlation id (see the next group)                              |

GitPaaS has no region and no deployment identifier: the [infrastructure architecture](./infrastructure-architecture.md)
gives one host and one Docker Compose stack. Thus these two fields of the generic model do not apply.

### 3.2 Correlation

| Field           | Source                                                                        |
|-----------------|--------------------------------------------------------------------------------|
| `request.id`    | `resolveRequestId(...)` of `core/ui/middlewares/request-id.middleware.ts`       |
| `task.id`       | `QueuedDeploymentTask.id`, on a `deployment.run` event only                     |
| `parent.request_id` | The `request.id` of the request that queued the task (see section 6, phase 4) |

`parent.request_id` is the only new persisted value that this plan needs. It connects the fast
`POST /deployments` request to the background run that it started. Today there is no such connection.

### 3.3 Request details

Present on an `http.request` event.

| Field                | Source                                                                 |
|----------------------|-------------------------------------------------------------------------|
| `http.method`        | Express request                                                         |
| `http.route`         | The route pattern, for example `/api/v1/deployments/:id` — low cardinality |
| `http.path`          | The concrete path, with the identifiers — high cardinality               |
| `http.query_keys`    | The **names** of the query parameters, and never their values           |
| `http.status_code`   | The status the response wrote                                           |
| `http.duration_ms`   | Monotonic duration, from `process.hrtime.bigint()`                      |
| `http.request_bytes` | `content-length` of the request                                         |
| `http.user_agent`    | Request header                                                          |
| `http.sse`           | `true` for the log stream endpoint (`@Sse` in `features/logs/ui/controllers/logs.controller.ts`) |
| `http.client_aborted`| `true` when the connection closed before the response finished          |

### 3.4 Actor context

The generic model speaks of a user tier and an account age. GitPaaS is a **single-tenant control plane** with
operator accounts only, and has no tier and no account. Thus the applicable fields are:

| Field              | Source                                                                     |
|--------------------|-----------------------------------------------------------------------------|
| `user.id`          | `request.user` that `JwtStrategy.validate` attaches (`features/authentication/infrastructure/passport/jwt.strategy.ts`) |
| `user.role`        | `UserRole` of `features/users/domain/models/user.models.ts` (`admin` or `user`) |
| `auth.public_route`| `true` when the `@Public()` decorator removed the route from the global guard |
| `auth.outcome`     | `authenticated`, `rejected` or `anonymous`                                  |

`user.email` is **not** a field. See section 7.

### 3.5 Business context

These are the real GitPaaS domain concepts. Each field is present only when the unit of work touches it.

| Field                    | Source                                                                  |
|--------------------------|--------------------------------------------------------------------------|
| `project.id`             | `Project.id`                                                             |
| `service.id`             | `Service.id`                                                             |
| `service.slug`           | `getServiceSlugUseCase` of `shared/application/get-service-slug.use-case.ts` |
| `deployment.id`          | `Deployment.id`                                                          |
| `deployment.status`      | `DeploymentStatus` (`pending`, `running`, `success` or `failed`)          |
| `deployment.branch`      | `Deployment.branch`                                                      |
| `deployment.commit`      | `Deployment.commit` (the SHA)                                            |
| `deployment.trigger`     | `Deployment.triggeredBy`                                                 |
| `deployment.compose_path`| `Deployment.composerPath`                                                |
| `deployment.attempt`     | The attempt counter of the queue task                                    |
| `deployment.log_lines`   | The quantity of lines that went to the `LogStore` during the run          |
| `docker.project`         | The compose project name, which is the `io.gitpaas.project` label value   |

### 3.6 Integration context

Do not write one event for each outbound call. Count and time the calls **in the event of the unit of work**.
Thus the shape stays flat and the quantity of events does not increase.

| Field pattern              | Meaning                                                    |
|----------------------------|-------------------------------------------------------------|
| `deps.<name>.calls`        | Quantity of calls to the dependency during the unit of work  |
| `deps.<name>.duration_ms`  | Sum of the time in the dependency                            |
| `deps.<name>.errors`       | Quantity of calls that failed                                |
| `deps.<name>.max_ms`       | Slowest single call, which gives the tail latency            |

The names come from the adapters that exist: `github` (`GithubSourceControlAdapter`), `docker`
(`DockerContainerRuntimeAdapter` and `DockerExecutorAdapter`), `redis` (`RedisLogStoreAdapter`) and `postgres`
(the TypeORM repositories).

Some calls have data that is of use for the debug operation. Add these fields only where they apply:

| Field                        | Meaning                                          |
|------------------------------|---------------------------------------------------|
| `deps.github.repository_id`  | The numeric repository id that the adapter used   |
| `deps.github.ref`            | The branch or the SHA that the adapter requested  |
| `deps.github.archive_bytes`  | The size of the tarball                           |

### 3.7 Error information

Present when the unit of work failed. The exception filter can give each of these values today.

| Field              | Source                                                                          |
|--------------------|----------------------------------------------------------------------------------|
| `error.type`       | The constructor name of the thrown value                                         |
| `error.code`       | The `code` of the `DomainError`, or the generic `CLIENT_ERROR` / `SERVER_ERROR` that the filter gives |
| `error.message`    | The internal message, which is **not** the message that the client receives       |
| `error.cause_chain`| The list of the names of the chained causes, which the filter walks today in `resolveStack` |
| `error.stack`      | The full stack chain, kept only on a 5xx (see section 5)                          |
| `error.retriable`  | `true` when the failure lets the queue try the task again                         |

Because the event carries `error.code` and the client envelope carries the same `code`, a user can quote the
`requestId` and the `code` of the envelope, and one query finds the full event.

### 3.8 Policy and flags

GitPaaS has **no feature-flag system** today. Do not invent one. Keep the `flags.*` namespace free for a later
use, and record the effective settings that do change the behaviour of the unit of work:

| Field                 | Source                                                    |
|-----------------------|------------------------------------------------------------|
| `policy.throttler`    | `default` or `stream`, from the throttler that applied      |
| `policy.logs_max_lines` | `LOGS_MAX_LINES`, which limits the hot log store           |
| `sampling.kept_reason`| Why the sampler kept the event (see section 5)              |
| `sampling.rate`       | The probability with which the event was kept               |

---

## 4. Architecture

Each piece keeps the layering rule of the backend: an outer layer can depend on an inner layer, and never the
opposite. All the new files are **new**.

```text
                     (new) core/ui/middlewares/wide-event.middleware.ts
                                        │  starts the scope, emits at the end
                                        ▼
  ┌──────────────── AsyncLocalStorage scope ─────────────────────────────┐
  │  Guards → Interceptors → Controller → Service → Use case → Adapter   │
  │      each layer calls enrichWideEvent({ ... })                       │
  │  AllExceptionsFilter adds the error fields                           │
  └──────────────────────────────────────────────────────────────────────┘
                                        │  response 'finish' / 'close'
                                        ▼
                      shouldKeepWideEvent(event)  ── no ──► dropped
                                        │ yes
                                        ▼
                          WideEventSink.emit(event)  ──► one JSON line
```

### 4.1 The domain pieces

- **`core/domain/models/wide-event.models.ts`** *(new)* — the `WideEvent` type. It is a flat record of the
  fields of section 3. It uses no vendor type, so the domain and the application layer can name it.
- **`core/domain/ports/wide-event-sink.port.ts`** *(new)* — the `WideEventSink` port with one method:

  ```ts
  /**
   * Destination of the completed wide events.
   */
  export interface WideEventSink {
      /**
       * Publishes one completed wide event.
       *
       * @param event Completed wide event
       */
      emit: (event: WideEvent) => void;
  }
  ```

  The method returns `void` and never throws. An observability failure must never fail a request.
- **`core/domain/utils/should-keep-wide-event.util.ts`** *(new)* — the pure sampling function of section 5.
- **`core/domain/constants/wide-event.constants.ts`** *(new)* — the event names and the sampling constants.

### 4.2 Where the event lives during the request

The event must be reachable from each layer, and no layer must receive it as a parameter through all the call
chain. Thus the plan uses **`AsyncLocalStorage`** of the Node `node:async_hooks` module. It is part of Node and
needs no new dependency.

- **`core/infrastructure/observability/wide-event.context.ts`** *(new)* — one module-level
  `AsyncLocalStorage<WideEvent>` and three plain exported functions, because these collaborators keep no
  injected state:

  ```ts
  const storage = new AsyncLocalStorage<Partial<WideEvent>>();

  /**
   * Runs a unit of work inside a fresh wide-event scope.
   *
   * @param seed Fields known when the unit of work starts
   * @param work Unit of work to run
   *
   * @returns Whatever the unit of work returns
   */
  export function runWithWideEvent<T>(seed: Partial<WideEvent>, work: () => T): T {
      return storage.run({ ...seed }, work);
  }

  /**
   * Adds fields to the wide event of the current unit of work.
   *
   * @param fields Fields to add
   */
  export function enrichWideEvent(fields: Partial<WideEvent>): void {
      Object.assign(storage.getStore() ?? {}, fields);
  }
  ```

  `enrichWideEvent` does nothing when there is no scope. Thus a unit test, a CLI path or the bootstrap code
  calls it with no risk.

### 4.3 Where the event is made and emitted

**A middleware, and not an interceptor.** In NestJS, the guards run **before** the interceptors. The
application has a global `JwtAuthGuard` and a global `ThrottlerGuard`. Thus an interceptor would not see a 401
or a 429, which are exactly the events that you want. A middleware runs before all of them.

- **`core/ui/middlewares/wide-event.middleware.ts`** *(new)* — it runs immediately after
  `requestIdMiddleware` in `src/bootstrap.ts`, so the correlation id is already resolved:

  ```ts
  app.use(requestIdMiddleware);
  app.use(buildWideEventMiddleware(sink));   // new
  app.use(helmet());
  ```

  The middleware seeds the event with the service context, the correlation id and the request details, and
  registers the emission on the `finish` and the `close` events of the response. A guard flag makes sure that
  one request emits one event only, because a client abort can raise the two events.

- **`core/infrastructure/observability/stdout-wide-event.sink.ts`** *(new)* — the first adapter. It writes one
  JSON line to `process.stdout`. It does **not** go through `NestLoggerAdapter`, because the Nest logger adds
  a text prefix and a colour, which breaks the machine reading. `CoreModule` declares it in its `providers`
  and its `exports`, like the other global adapters, and the consumers inject the concrete class with the type
  of the port.

### 4.4 How each layer enriches the event

- **`ui/controllers/` and `ui/services/`** call `enrichWideEvent` directly. They already import from `@core/*`
  (for example `translateError` in `features/deployments/ui/controllers/deployments.controller.ts`), so nothing
  in the layering changes.
- **`infrastructure/`** adapters call `enrichWideEvent` in the place where they write a text line today. The
  GitHub adapter is the clean example: its private `run<T>()` helper already wraps every call, so the timing
  and the counting of `deps.github.*` need one change in one method.
- **`application/`** use cases must stay pure and must not import the infrastructure. Where a use case must add
  a field, give it the port as an **explicit positional collaborator**, before the data, exactly as it receives
  its repositories today:

  ```ts
  export async function runDeploymentUseCase(
      deploymentsRepository: DeploymentsRepository,
      sourceControl: SourceControl,
      dockerExecutor: DockerExecutor,
      logStore: LogStore,
      events: WideEventSink,      // new collaborator, still a port
      payload: DeploymentRunTask,
  ): Promise<void> { /* … */ }
  ```

  Prefer the UI edge. Enrich a use case only when the value exists nowhere else.

### 4.5 The relation to the existing error handling

`core/ui/filters/all-exceptions.filter.ts` is already the one place that sees every failure, that resolves the
correlation id and that walks the `cause` chain. It keeps that role, but it stops being a writer:

- `buildEnvelope` does not change. The client contract stays the same.
- `logException` is replaced by an `enrichWideEvent` call that adds the `error.*` fields of section 3.7. The
  filter runs inside the request, thus inside the `AsyncLocalStorage` scope, and the middleware emits the
  complete event some milliseconds later, when the response finishes.
- The result is that a failed request gives **one** record that has the error **and** the duration, the route,
  the actor and the business identifiers. Today the failure line has none of them.

`core/ui/translators/http-error.translator.ts` does not change. It is a pure translation and writes no log.

### 4.6 The relation to the Redis Streams log store

They stay separate, and the plan does not mix them:

| | `features/logs/` (`LogStore`) | Wide events |
|---|---|---|
| What it holds | The output of a deployment | The observability record of the backend |
| Who reads it | The end user, in the browser, over SSE | The operator, in a query tool |
| Where it lives | Redis stream `logs:<deploymentId>`, then the PostgreSQL `logs` table | The wide-event sink |
| Lifetime | The run, then the archive of the deployment | The retention of the observability store |

The connection between the two is one field: `deployment.id`. The wide event of a run carries it, so you go
from an event to the full output of that run. Do **not** put the output lines in the wide event: the output of
a build can contain the secrets of the user.

---

## 5. Sampling

The decision is a **tail** decision. It runs in the emission path, after the outcome is known, in the pure
function `shouldKeepWideEvent` of `core/domain/utils/should-keep-wide-event.util.ts`.

The generic policy speaks of VIP customers. **GitPaaS has no customers.** It is a single-tenant control plane,
and the quantity of its human requests is small. The equivalent of the "important request" is the request that
changes the state of the platform. Thus the policy is:

**Keep 100 % of:**

| Condition                                          | `sampling.kept_reason` | Why                                   |
|----------------------------------------------------|------------------------|----------------------------------------|
| `http.status_code >= 500`                          | `server_error`         | Each one is a defect                    |
| The event carries an `error.code`                  | `error`                | Includes each 4xx that has a domain code |
| `http.method` is not `GET`                         | `mutation`             | A write is rare and changes the state    |
| The route belongs to `authentication`              | `auth`                 | Security audit                          |
| `event.name` is `deployment.run`                   | `deployment`           | The reason the platform exists          |
| `http.sse` is `true`                               | `stream`               | Rare and long-lived                     |
| `http.duration_ms` is more than the slow threshold | `slow`                 | The tail latency                        |

**Keep a random 5 % of** the remaining events, which are the fast, successful `GET` requests.
`sampling.kept_reason` is then `random`, and `sampling.rate` is `0.05`. The rate must be a field of the event,
so a later count can multiply the kept events again and give the true totals.

**The slow threshold.** The correct value is the p99 of the route. At the beginning there is no store that can
compute it. Thus phase 5 starts with a fixed value from a new `WIDE_EVENT_SLOW_MS` environment variable
(1000 ms is a reasonable start), and the value moves to a per-route p99 when the store can give one. The
threshold must **not** apply to the SSE route, because that route is slow by design; the `http.sse` rule keeps
it already.

**Never drop a `deployment.run` event.** There are some tens of them in a day, and each one is the record of a
change of the state of the server.

---

## 6. Migration plan

Each phase is independently shippable and leaves the application in a correct state. Nothing is removed before
its replacement operates.

### Phase 0 — The rails (no behaviour visible)

- Add the model, the port, the sampling stub (which keeps everything), the constants and the
  `wide-event.context.ts` store.
- Add `stdout-wide-event.sink.ts` and declare it in `CoreModule`.
- Add `wide-event.middleware.ts` and register it after `requestIdMiddleware` in `src/bootstrap.ts`.
- Emit an event that has only the groups 3.1, 3.2 and 3.3.
- **Remove nothing.** The old text lines continue. The two systems run together.

### Phase 1 — Converge the errors

- `AllExceptionsFilter` calls `enrichWideEvent` with the `error.*` fields.
- Verify on the server that each failure now gives one event that has the error and the request data.
- **Remove**: the `logException` method of the filter and its `AppLogger` dependency. From this point one
  failed request gives one record and not two.

### Phase 2 — The actor and the business context

- Add the `user.*` and the `auth.*` fields, from `request.user` that `JwtStrategy` attaches.
- Add the `project.*`, `service.*` and `deployment.*` fields from the UI services and the controllers of the
  applicable features. Take `projects` and `deployments` first; the other features follow the same pattern.
- **Remove nothing yet.**

### Phase 3 — The outbound calls

- Wrap the `run<T>()` helper of `GithubSourceControlAdapter` and give the `deps.github.*` counters.
- Do the same in the Docker adapters and in `RedisLogStoreAdapter`.
- **Remove**: the progress and breadcrumb lines of these adapters, for example
  `logger.log('Creating GitHub App installation client', …)`, `logger.log(\`Pulling images for project …\`)` and
  the `logger.warn` lines of `DockerServiceRuntimeResourcesAdapter`. The counters replace them, and the failure
  data is in `deps.<name>.errors` and in the `error.*` fields.

### Phase 4 — The background unit of work

- Persist `parent.request_id` on the queue task row, so the run connects to the request that queued it. This is
  a schema change: a new nullable column on the queue table, in the entity **and** in a new numbered SQL file
  in `iac/production/migrations/`.
- `DeploymentRunnerService.run(task)` calls `runWithWideEvent` for each task and emits one `deployment.run`
  event with the outcome, the attempt, the duration and the `deps.*` counters.
- **Remove**: the private `logFailure` method of `DeploymentRunnerService`.

### Phase 5 — Tail sampling

- Implement `shouldKeepWideEvent` with the policy of section 5, and add the `WIDE_EVENT_SLOW_MS` and
  `WIDE_EVENT_SAMPLE_RATE` variables to `EnvironmentVariables`.
- Ship it only when the true volume is known, because a sampler that operates too early hides the events that
  you need to size it.

### Phase 6 — The transport and the store

- Replace `StdoutWideEventSink` with the adapter of the store that section 7 selects. Because the consumers
  depend on `WideEventSink`, this is one new file and one line in `CoreModule`.

### What stays with `AppLogger`

Do not delete `AppLogger`. Some messages have **no** unit of work and thus no event to enrich:

- the process handlers and the bootstrap failure of `src/main.ts`;
- the lifecycle messages, for example the shutdown warning of `RedisConnection.onModuleDestroy`;
- the seed of the development administrator in `features/users/ui/services/users.service.ts`.

These stay as text lines. The rule after the migration is simple: **inside a unit of work, enrich the event;
outside a unit of work, use `AppLogger`.**

---

## 7. Open questions and risks

### The store and the query tool

This is the largest open decision, and the plan does not need it before phase 6.

- **`stdout` and `docker logs` only** — the phase 0 position. No new component, but there is no query language.
  It is not sufficient as an end state.
- **A `wide_events` table in the existing PostgreSQL, with a `JSONB` column** — attractive, because PostgreSQL
  is already in the topology and the volume of a single-operator control plane is small. The risks are that the
  observability writes share the database of the application, and that a `JSONB` scan is not a columnar scan.
- **A columnar store (for example ClickHouse)** — the correct technical answer for wide events, and the article
  is right that high cardinality is cheap on a columnar store. It adds one more service to the Compose stack of
  a single host. See [infrastructure architecture](./infrastructure-architecture.md).
- **A hosted vendor** — no operation work, but the events leave the server, which section "PII" makes a
  question and not a detail.

**OpenTelemetry** is a delivery mechanism and not an answer to this question. If it is adopted, the wide event
becomes the attribute set of one span, and the `WideEventSink` port is the only file that changes.

### Personal data

- **The email of the user must not be a field.** `User.email` is personal data. `user.id` and `user.role` are
  sufficient to debug, and the id gives the email through the database when it is truly necessary.
- **Never copy a request body into the event.** The login DTO carries a password. Section 3.3 keeps
  `http.query_keys` (the names) and not the values, for the same reason.
- **The names of the repositories, the branches and the commit messages** can show private data of the
  organization. `deployment.commit` (the SHA) and `deployment.branch` are proposed;
  the commit **message** is not. Confirm this before phase 2.
- **The output of a deployment stays out of the event.** A build prints the environment, and thus the secrets.

### Technical risks

- **The SSE route and the asynchronous context.** The log stream returns an Observable that lives for the full
  run. Its `finish` event arrives minutes later, and the RxJS pipeline crosses the blocking Redis reads. Thus
  the `AsyncLocalStorage` store can be lost in an enrichment that happens deep in the pipeline. The mitigation
  is to take the reference to the store one time, in the middleware, and to give it to the stream path
  explicitly. Verify this on the SSE route before you trust the field of a stream event.
- **Double emission.** A client abort raises `close` and can also raise `finish`. The middleware must have a
  guard flag that permits one emission only.
- **The size of an event.** `error.stack` with the full `cause` chain can be some kilobytes. Keep it only on a
  5xx, and consider a maximum length.
- **The cardinality of `http.path`.** It carries UUIDs. This is correct and wanted, but the events must always
  carry `http.route` as well, because a dashboard groups on the route and not on the path.
- **The existing tests.** `core/ui/filters/__tests__/all-exceptions.filter.spec.ts` asserts the calls to the
  logger. Phase 1 must move these assertions to the enrichment call.
- **A performance cost that is not measured.** `AsyncLocalStorage` has a cost on each asynchronous boundary. It
  is small, but it is not zero. Measure it on the SSE route, which has the largest quantity of boundaries.

### Open items

- Does `service.version` come from the `package.json` at build time, or from a Git SHA that the image build
  gives as an `APP_VERSION` build argument? The second gives more, and it needs a change in the image build.
- What is the retention of the events? A control plane can be satisfied with 30 days.
- Must the readiness probe (`GET /api/v1/server/readiness`) emit an event? It runs frequently and it succeeds
  almost always. The proposal is to keep it in the random 5 %, and to keep 100 % of its failures through the
  `server_error` rule.

---

## Related docs

- [Backend architecture](./backend-architecture.md) — the layers, the error handling and the log store
- [Backend business](./backend-business.md) — the domain words that the event schema uses
- [Infrastructure architecture](./infrastructure-architecture.md) — the topology that limits the store choice
