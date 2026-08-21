# Key flows

## Request

All the requests move through the layers in the same sequence, from the HTTP edge to the persistence and back:

```text
HTTP → Controller (ZodValidationPipe on the body, from a schema of @gitpaas/contracts) → Service → Use Case → Repository port ◄ adapter → PostgreSQL
```

Every controller binds `ZodValidationPipe` on its body parameter, with a schema of `@gitpaas/contracts`.

## Durable queue (background work)

The caller must be able to start work without knowledge of the time when the work runs. Thus a producer queues a task and a consumer takes it later. The queue is **durable and at-least-once**: each task is a database row, so the tasks stay after a restart, and an in-process channel only tells the consumer that there is new work. The `deployments` feature is the reference.

```text
queued ──(picked up)──► processing ──(ok)──► [row deleted]
   ▲                         │
   └──── retry (attempts<3) ─┤
                             └──(attempts exhausted)──► failed  (dead-letter;
                                                        deployment marked failed)
```

A successful run deletes the row, because the deployment record holds the durable result. A failure records the error and queues the task again, up to `MAX_ATTEMPTS` (`3`, in `features/deployments/domain/ports/deployment-queue.port.ts`) attempts. After the last attempt, the task goes to the dead-letter state **and** the deployment becomes `failed`, so no deployment stays `pending` for ever. At start-up, each unfinished task returns to `queued`, so work that a crash interrupted runs again.

The caller sees only the fast part: the request validates its input, writes a `pending` record, queues a run task, and returns the record **with its id** immediately. The consumer runs the tasks in sequence **for each compose project**, but different projects run at the same time. Thus a slow build does not delay the other stacks, and two runs of one stack cannot mix.

```text
mark processing → fetch repo archive → docker deploy
  (fans each output line to the log store)
  → mark success/failed → close the log stream → mark completed
```

An expected failure becomes a `failed` status, and the task ends correctly; the retry path is the last safety net, for an unexpected error only. Because delivery is at-least-once, a run can occur two times. The deploy operation tolerates this, because it always stops the old stack first.

## Server-Sent Events (live streams)

To send a long-running result to the client, the application uses Server-Sent Events: one long-lived response that carries one JSON-encoded event for each value. An SSE endpoint always has a REST companion that gives the durable history — in the `logs` feature, one endpoint for the live events of a deployment and one for its history.

A stream endpoint is not public, so it needs a Bearer token. The native `EventSource` API cannot set headers. Thus the frontend reads the stream with an SSE client that can send a token.

**Failure on a stream.** When the connection starts, the response headers are already sent. Thus the error envelope cannot be used, and a client that reads a dropped connection cannot know the cause. For this reason a stream **never** ends with a failure. It sends a typed `error` event and then completes. The event has the same `code` vocabulary as the HTTP envelope, and its `message` gives no internal data; the initial failure stays in the server log. The log stream sends one of these three events, and each one is JSON-encoded in the `data` field of the SSE message:

```jsonc
{ "type": "line", "data": "<one output line>" }              // one line of output
{ "type": "end", "status": "success" | "failed" }            // the run ended
{ "type": "error", "code": "<code>", "message": "<text>" }   // the log could not be read
```

The `end` event and the `error` event are both terminal. Only the `line` event and the `end` event are written to the store and archived; the `error` event goes to the subscriber only. Today the stream uses one code, `LOG_STREAM_UNAVAILABLE`.

### Deployment log store

The output of a deployment has two lives: a **hot** one, where the lines must arrive at the browser immediately, and a **cold** one, where the finished log must stay after the run. One domain port (`LogStore`) gives the four operations of that life cycle — append a line, complete the log with its terminal status, stream it, and purge it. The identifier of the stream is the identifier of the deployment. A Redis Streams adapter implements the port and uses the PostgreSQL logs repository as its archive.

```text
docker output ──append──► Redis stream  logs:<deploymentId>
                              │  └── live tail (XREAD BLOCK) ──► SSE subscriber
                complete ─────┴──► archive to PostgreSQL ──► key expires
```

- **Keys**: one stream key for each deployment (`logs:<deploymentId>`) and one companion lease key (`logs:<deploymentId>:producer`). Each entry is a flat field list: a line entry carries `type=line` and `content`, and the terminal entry carries `type=end` and `status`. A transformer makes and reads these fields, so no other file knows the shape.
- **Tuning constants**: `features/logs/infrastructure/redis/redis-log-store.constants.ts` holds the values that the points below use:

  | Constant                             | Value  | Purpose                                                                           |
  |---------------------------------------|--------|-------------------------------------------------------------------------------------|
  | `LOG_STREAM_BLOCK_MS`                 | `2000` | Longest time one blocking read waits for a new entry                                |
  | `LOG_STREAM_READ_COUNT`               | `200`  | Entries one blocking read may return at once                                        |
  | `LOG_STREAM_IDLE_ROUNDS_BEFORE_CLOSE` | `2`    | Idle rounds with no producer lease a reader tolerates before it closes the stream    |
  | `LOG_STREAM_GRACE_SECONDS`            | `60`   | How long the archived stream stays in Redis after `complete()`                      |
  | `LOG_STREAM_PRODUCER_LEASE_SECONDS`   | `300`  | How long the producer's lease survives without a refresh                            |
- **Retention**: each append writes the entry with an approximate `MAXLEN` trim, from the necessary `LOGS_MAX_LINES` variable. Thus Redis holds a bounded quantity of lines for each deployment. A value of zero disables the trim.
- **Read semantics**: one subscription uses one cursor. It starts at `0`, so the history arrives before the live tail on the same cursor, and there is no hand-off to bridge and nothing to remove twice. The reads block on a **dedicated blocking connection**, so a long read does not stall the other commands.
- **End of the log**: the terminal entry closes the subscription. Because a run can die without one, the producer also holds a short-lived lease that each append refreshes. If a blocking read finds no new entry and the lease is gone for two rounds, the reader closes the subscription. Thus no client waits for ever.
- **Archive and grace**: `complete()` writes the terminal entry, drops the lease, copies the full stream into PostgreSQL (the position in the stream gives the `seq` column), and then sets a short expiry on the key. The delay only lets a slow subscriber finish the tail that it reads. If the stream key is already gone, a new subscription replays the archived rows from the database and completes.
- **Removal**: `purge()` deletes the stream key, the lease key and the archived rows. The delete operations of a deployment and of a service call it.
- **Consumers**: the deploy use case sends each captured line to `append()` and calls `complete()` with `success` or `failed`; a failure also appends the error line first. The API gives the live view with an SSE endpoint that JSON-encodes each event, and the durable history with a `GET /logs?deploymentId=` endpoint that reads the archive. An append failure is logged and does not stop the run.

## Authentication

A global guard protects all the routes by default. A metadata flag makes a route public — the `@Public()` decorator. Five routes carry it today: `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh` and `POST /api/v1/auth/logout` (`authentication.controller.ts`), because the caller has no access token at login or has already given it up at refresh and logout; `GET /api/v1/server/readiness` (`server.controller.ts`), the dependency-aware readiness probe described in [Docker-facing capabilities](#docker-facing-capabilities); and `GET /api/v1/` (`app.controller.ts`), a trivial liveness check that answers `{ "status": "ok" }` with no dependency of its own. The login endpoint is rate-limited.

- **Tokens**: at login, the application validates the email and the password (the passwords have an argon2 hash). On each protected request, it validates the Bearer token, finds the user again, and **rejects the accounts that are not active**. Thus a disabled account loses access immediately, and not at the expiry of its token. The two token types use different secrets and lifetimes.
- **Rotation**: the refresh tokens stay in the database only as a hash, so a person who reads the table cannot make a token. A refresh operation verifies the signature, the expiry, the row and the hash, verifies again that the user is active, and then revokes the old row and gives a new pair. A row is revoked and never deleted, so a token that is sent two times is always rejected.

### Roles

Each user has a role (`admin` or `user`) in the database. Role-based access control is an **opt-in, per-route guard**, not a global rule: `RolesGuard` (`features/authentication/ui/guards/roles.guard.ts`) reads the roles that the `@Roles(...)` decorator declares on a handler or a controller, and lets an authenticated request through when its user role is not among them and no role is declared at all. A controller that wants the restriction adds `@UseGuards(RolesGuard)` and marks the routes it wants to close with `@Roles(UserRole.Admin)`. Today only the `providers` controller uses it: the read routes (`GET`, list repositories, list branches) stay open to each authenticated user, while `create`, `update`, `delete` and the credentials test route are admin-only.

## Docker-facing capabilities

The features that touch Docker use the same arrangement: a domain port gives the capability in business terms, and one infrastructure adapter speaks to the daemon. Thus the use cases stay independent of the container technology. The container runtime is structural, so `core/` owns that port.

- **Deploy**: the operation extracts the source archive, builds the services that need a build, pulls the other images, stops the old stack, labels each new resource, starts the stack, and captures a limited quantity of start-up output. It reports each line while it operates, so the run is visible in the live log.
- **Logs**: one port gives the write, the read, the end and the removal of the output of a deployment. See [Deployment log store](#deployment-log-store).
- **Cleanup**: the database cascade removes the deployments and the logs of a service, and the delete operation also removes the containers, the networks and the images that GitPaaS built. It keeps the images that it pulled, because other stacks can use them, and it is best-effort: a daemon failure does not stop the delete operation in the database.
- **Server**: the maintenance operations remove the unused resources and the containers that belong to no service. They select only the resources that have the GitPaaS labels, so they never touch the control plane. The readiness endpoint is public: it examines the database and the daemon at the same time, counts an error as "down", and returns `200` with the condition of each one, or `503` with that same breakdown in the `details` key of the [error envelope](#the-error-envelope).
- **Read-only**: some features only read from Docker or from GitHub, and use no database table.

### Docker resource labelling

GitPaaS uses the same daemon as the control plane and as the third-party stacks. Thus labels give the ownership: the marker label shows that a resource is a GitPaaS resource, and the project label shows the stack of the applicable service.

| Label                        | Value              | Purpose                                    |
|------------------------------|--------------------|--------------------------------------------|
| `io.gitpaas.managed`         | `true`             | GitPaaS created this resource              |
| `io.gitpaas.project`         | service slug       | Which service's stack it belongs to        |
| `com.docker.compose.project` | service slug       | Compose grouping (also set by the library) |
| `com.docker.compose.service` | compose service    | Compose service (also set by the library)  |

## Providers and encrypted credentials

A `provider` row gives a service the credentials it needs to reach its Git host — today only a GitHub App. The domain port `ProviderClient` (`features/providers/domain/ports/provider-client.port.ts`) gives the business operations in provider-agnostic terms — list the reachable repositories, list the branches of a repository, resolve a ref to its head commit, download a source archive, verify a set of credentials, and convert a manifest's temporary code into the configuration of a new application — and the GitHub adapter implements it over `@octokit/rest`, authenticated per call with `@octokit/auth-app`. The conversion takes no credentials of a provider, because the application does not exist yet when it runs.

- **Encryption at rest**: the private key of a provider never reaches the database in clear text. The domain port `SecretCipher` (`core/domain/ports/secret-cipher.port.ts`) gives `encryptSecret`/`decryptSecret`, and `SecretCipherAdapter` (`core/infrastructure/crypto/secret-cipher.adapter.ts`) implements it with AES-256-GCM, under the 32-byte key of the required `PROVIDERS_ENCRYPTION_KEY` environment variable, read fresh on every call. The stored payload carries the initialisation vector, the authentication tag and the cipher text, each in hexadecimal and separated by a colon, so a fresh vector on every call keeps the same secret from sealing to the same payload twice.
- **No key leaves the server**: the read model of a provider (`Provider`) never carries the private key. It carries only its `keyFingerprint`, the first eight characters of the SHA-256 hash of the key in clear text, so an operator can tell two keys apart without exposing either of them.
- **Credentials test**: `POST /api/v1/providers/:id/test` decrypts the stored key, calls `verifyCredentials` against the real provider, and answers `{ outcome, missingPermissions }`, with `outcome` one of `ok`, `unauthorized` or `incomplete`. GitHub can accept the credentials and still lack a needed permission, so a single mark of success would hide that case; the use case compares the permissions GitHub reports against the constant of the needed ones, and the call changes no stored record.
- **Repository and branch discovery**: `GET /api/v1/providers/:providerId/repositories` and `GET /api/v1/providers/:providerId/repositories/:repositoryId/branches` decrypt the stored key on each call and list the repositories or the branches that the installation of the provider can reach. A service picks its source among these lists at creation time.
- **Roles**: see [Roles](#roles). `create`, `update`, `delete` and the credentials test are admin-only; the four read routes (list, find by id, list repositories, list branches) stay open to each authenticated user.

### Registering an App from a manifest

GitHub's manifest flow needs two visits to `github.com` and hands back its credentials in two separate steps, so the feature keeps a **pending registration** — its own table, `provider_registrations`, unique on `state` — between them. A row holds the `state`, the requested `name` and owner, a `step` (`awaiting_creation` then `awaiting_installation`), and, once GitHub answers, the application id, its short name and the sealed private key. A separate table keeps `providers` meaning "a provider that operates"; a row that never finishes describes no working provider.

Three use cases in `features/providers/application/` carry the flow, each reached through `POST /api/v1/providers/registrations`, `POST /api/v1/providers/registrations/:state/conversion` and `POST /api/v1/providers/registrations/:state/completion`, all admin-only:

1. **Start** refuses a taken name, writes the row at `awaiting_creation`, and answers with the manifest and the address of GitHub.
2. **Conversion** reads the row by `state`, refuses one that is not at `awaiting_creation`, converts GitHub's code through `ProviderClient`, seals the returned key, and moves the row to `awaiting_installation`.
3. **Completion** reads the row by `state`, refuses one that is not at `awaiting_installation`, and writes the `Provider` together with the installation id GitHub gave — in one transaction with the removal of the pending row, so a failure of either act leaves neither done.

A wrong `state` answers `404`; a step that disagrees with the call, or a name already taken, answers `409`.

An operator can abandon the flow at any point, leaving a key with no provider. `RemoveExpiredProviderRegistrationsJob` is the backend's first scheduled job (`@Cron`, registered through `ScheduleModule.forRoot()`): it runs every hour and deletes every row past its twelve-hour `expiresAt`, never calling GitHub and never removing the App itself.

## Error handling

All the failures use one path, from the layer that finds the failure to the JSON that the client reads.

### The layering rule

A failure moves through the layers, and each layer does only its own part:

- **`application/`**: a use case finds the business condition and throws a **domain error**. This is the usual source of a domain error.
- **`infrastructure/`**: an adapter or a repository can also throw a domain error, but only to change a vendor failure into a business condition. The related transformer does this change, and it puts the initial error in `{ cause }`.
- **`ui/services/`: the services do no error work. They call the use case and let the error go up.
- **`ui/controllers/`: the controller is the only location that knows HTTP. Its catch block is `throw translateError(error)`.

### Domain errors

`core/domain/errors/domain.error.ts` holds the abstract `DomainError` base class, and each feature error class extends it. The base class extends the standard `Error`, accepts the standard `ErrorOptions`, and thus keeps the initial failure in `{ cause }`. It must never import `@nestjs/common`, because a domain error carries no HTTP data.

Each subclass gives a **`code`**: a stable, machine-readable identifier of the type of the error (for example, `SERVICE_NOT_FOUND`). The client uses this code and does not read the message text.

Each feature declares its error classes in `domain/errors/`, in a file with the name pattern `<entity>.errors.ts` (for example, `service.errors.ts`).

### The HTTP translator

`core/ui/translators/http-error.translator.ts` has one `translateError` function and one `DOMAIN_ERROR_TRANSLATIONS` map. The controllers do not repeat a catch block. The function applies these rules, in this sequence:

1. An `HttpException` comes back with no change, so a status that a guard or a deeper layer decided is not put in a new wrapper.
2. A `DomainError` with a mapped `code` becomes the mapped exception, and the initial error goes into `{ cause }`.
3. Each other error goes to the optional `unexpected` policy of the caller. The Docker-facing controllers use this policy to give a 503 with a hint.
4. If there is no such policy — and **for a `DomainError` with no mapping** — the error comes back with no change. Thus it goes to the global filter and becomes a 500.

### The error envelope

`core/ui/filters/all-exceptions.filter.ts` is a global filter (`APP_FILTER`) and gives the same JSON shape to each failed request:

```jsonc
{
  "statusCode": 404,
  "code": "PROJECT_NOT_FOUND",
  "message": "Project 3ee8… not found",
  "error": "Not Found",
  "timestamp": "2026-02-11T09:14:22.481Z",
  "path": "/api/v1/namespaces/…/projects/3ee8…",
  "requestId": "9d1f…"
}
```

`code` is the machine-readable identifier the client relies on. When the `HttpException` carries a mapped `DomainError` in `{ cause }`, `code` is that domain error's own code (for example `PROJECT_NOT_FOUND`); otherwise it falls back to one of two generic codes: `CLIENT_ERROR` for a 4xx with no domain error, and `SERVER_ERROR` for a 5xx or for an exception the filter did not expect at all. An optional `details` key carries a structured payload, for example the per-dependency breakdown of the readiness probe.

An unexpected error never gives internal data: the message becomes `Internal server error`, and the stack stays in the telemetry event.

This is the readiness probe: the controller throws `ServiceUnavailableException(result)`, and thus the breakdown of each dependency stays in `details` and is not lost. The `code` is the generic server code, because a readiness failure has no domain error and its status is a 5xx.

### Correlation id

`core/ui/middlewares/request-id.middleware.ts` operates before all the other middleware. It takes the inbound `X-Request-Id` header if the value is one clean, not empty string of 128 characters or less; if not, it makes a UUID. Then it writes the id back on the request headers, so each later consumer reads one value that is already resolved, and it sets the `X-Request-Id` response header. The filter puts the same id in the envelope, and the telemetry middleware puts it in the `request.id` and the `trace.id` fields of the event. Thus a user can quote the id, and you can find the failure in the server output.

### Recording a failure

The filter writes no log line. It adds the `error.*` fields to the telemetry event of the request:

- `error.type`, `error.code` and the internal `error.message`, which is not the message that the client receives.
- `error.cause_chain`, the names of the chained causes. The filter follows the `{ cause }` chain, and a cycle in the chain cannot make a loop.
- `error.stack` on a 5xx only. The filter joins the stack of each cause with a `Caused by:` prefix, thus the record shows the initial failure and not only the exception that the translator made, and caps the result at 4096 characters.

The telemetry middleware emits the complete event when the response finishes. Thus a failed request gives one record that has the error **and** the duration, the route, the actor and the business identifiers. See [Telemetry and logging](#telemetry-and-logging).

Thus a controller must not log the failure that it translates. If it did, the same failure would appear two times, and the second time with no request id.

### Deviations

The Passport strategies (`features/authentication/infrastructure/passport/jwt.strategy.ts` and `local.strategy.ts`) throw `UnauthorizedException` and do not use the translator. The guard operates before each controller method, so no controller can do the translation there.

### Process-level failures

`src/main.ts` puts a handler on the process for the failures that no request can catch:

- `unhandledRejection` writes an `error` log and lets the process continue, because the background deployment runner must continue to empty its queue.
- `uncaughtException` writes an `error` log and stops the process with the code 1, because the state of the process is not known after such an error.

`src/bootstrap.ts` calls `app.enableShutdownHooks()`, and thus `SIGTERM` and `SIGINT` in a container go to the `onModuleDestroy` hooks of the modules and the connections close in a clean way.

## Telemetry and logging

The backend writes no text line for each step of its work. It writes **one telemetry event for each unit of work**: one flat record (`TelemetryEvent` in `core/domain/models/telemetry.models.ts`), seeded at the start, enriched through the layers, emitted one time at the end as one JSON line on stdout. The two units of work are one HTTP request (`http.request`) and one background deployment run (`deployment.run`).

```text
TelemetryMiddleware ─ seeds the event, opens the scope (runWithTelemetry)
   │  Guard → Controller → Service → Use case → Adapter   each calls enrichTelemetry({ … })
   │  AllExceptionsFilter                                  adds the error.* fields
   └─ response 'finish'/'close' → shouldKeepTelemetryUseCase → writer → one JSON line
```

`runWithTelemetry(seed, work)` runs a unit of work in a fresh `AsyncLocalStorage` scope, and `enrichTelemetry(fields)` adds fields to the event of the current scope. Both are plain functions of `core/infrastructure/telemetry/telemetry.context.ts`. `DeploymentRunnerService` opens its own scope for each task; its seed carries `parent.request_id`, thus one `trace.id` connects the request that queued the task to the background run.

### The event schema

The keys are dotted and `snake_case`, and a field is present only when the work touches it: service identity (`service.name`, `service.version`, `service.env`, `host.name`, `process.pid`), correlation (`trace.id`, `request.id`, `task.id`, `parent.request_id`), `http.*` (the low-cardinality `route`, the `path`, the `query_keys` **names** only, `status_code`, `duration_ms`, `sse`, `client_aborted`), the actor (`user.*`, `auth.*`), the business identifiers (`project.*`, `service.id`, `deployment.*`, `docker.project`), `deps.*`, `error.*` and `sampling.*`. `TelemetryEvent` in `core/domain/models/telemetry.models.ts` is the authoritative schema: it declares every field the backend may write, and a field with no place in it must be added there first, per [the rule for contributors](#the-rule-for-contributors).

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

### Dependency counters

An outbound call gets no event of its own. `recordDependencyCall(name, durationMs, failed)` adds the call to the counters of the current event — `calls`, `duration_ms`, `errors` and `max_ms` — for `github`, `docker`, `redis` and `postgres`. The clean shape is one private helper that wraps every call of an adapter. `postgres` is instrumented centrally: `createInstrumentedDataSource` wraps the `query` method of each query runner and `CoreModule` wires it as the `dataSourceFactory` of `TypeOrmModule.forRootAsync`, thus every repository is covered with no work of its own.

### Tail sampling

`shouldKeepTelemetryUseCase` decides **after** the outcome is known. The first rule that matches wins, and the event is kept with `sampling.rate: 1` and that `sampling.kept_reason`: `server_error` (status 500 or more), `error` (the event carries an `error.code`), `mutation` (the method is not `GET`), `auth` (the route starts with `/api/v1/auth`), `deployment` (a `deployment.run` event), `stream` (`http.sse` is true) and `slow` (the duration is above the threshold). The `stream` rule comes before the `slow` rule, so a long SSE connection never counts as slow. Every other event — a fast, successful `GET` — is kept with the probability of the rate, with the reason `random` and the effective rate in `sampling.rate`, so a later count can give the true totals again. `TELEMETRY_SLOW_MS` (default `1000`) and `TELEMETRY_SAMPLE_RATE` (default `0.05`) tune the policy and are validated at boot.

### Transport and retention

The writer sends one JSON line for each kept event to `process.stdout`, and not through `AppLogger`, whose prefix and colour break the machine reading. There is **no persistent store and no query tool**: the retention is the rotation of the Docker log driver, and `docker logs` with a text filter is the tool. Because the `json-file` driver splits a line above 16 KB, `error.stack` is capped at 4096 characters for the whole joined cause chain, on the two paths that publish a stack: the exception filter and the deployment runner.

### The rule for contributors

> **Inside a unit of work, enrich the event. Outside a unit of work, use `AppLogger`.**

Add a field, and not a text line; if the value has no field, add it to `TelemetryEvent` first. `AppLogger` stays in the three places that have no event to enrich: the process handlers and the bootstrap failure of `src/main.ts`, the lifecycle messages (for example the shutdown warning of `RedisConnection`), and the seed of the development administrator in the `users` service.