# Key flows

## Domain model

A **namespace** is a group of **projects**. A **project** is a group of **services**. A **service** is a unit that you can deploy: it names a source repository, a compose file path and a deployment branch. A **deployment** is one attempt to start the Docker Compose stack of a service on the server. A **provider** is the account that gives a service access to its Git host. A **user** is an operator who authenticates to use the API. Each of these names is a feature of `src/features/`, and the sections below use the same words.

## Request

All the requests move through the layers in the same sequence, from the HTTP edge to the persistence and back:

```text
HTTP → Controller (ZodValidationPipe on the body, from a schema of @gitpaas/contracts) → Service → Use Case → Repository port ◄ adapter → PostgreSQL
```

## Durable queue (background work)

The caller must be able to start work without knowledge of the time when the work runs. Thus a producer queues a task and a consumer takes it later. The queue is **durable and at-least-once**: each task is a database row, so the tasks stay after a restart, and an in-process channel only tells the consumer that there is new work. The `deployments` feature is the reference.

```text
queued ──(picked up)──► processing ──(ok)──► [row deleted]
   ▲                         │
   └──── retry (attempts<3) ─┤
                             └──(attempts exhausted)──► failed  (dead-letter;
                                                        deployment marked failed)
```

A successful run deletes the row, because the deployment record holds the durable result. A failure records the error and queues the task again, up to a fixed number of attempts. After the last attempt, the task goes to the dead-letter state **and** the deployment becomes `failed`, so no deployment stays `pending` for ever. At start-up, each unfinished task returns to `queued`, so work that a crash interrupted runs again.

The caller sees only the fast part: the request validates its input, writes a `pending` record, queues a run task, and returns the record **with its id** immediately. The consumer runs the tasks in sequence **for each compose project**, but different projects run at the same time. Thus a slow build does not delay the other stacks, and two runs of one stack cannot mix. Because delivery is at-least-once, a run can occur two times; the deploy operation tolerates this, because it always stops the old stack first.

## Deployments

`POST /api/v1/deployments` carries only a `serviceId`. The server calculates the rest, so the request means "deploy the head of the branch of this service, now". The create-deployment use case checks that the service exists and is deployable (it names a provider, a repository and a branch), then resolves the head commit of the branch through the `ProviderClient` of the provider, so the record points at an exact commit.

The use case writes a record with the status `pending`, queues the run task, and returns the record before any Docker work runs, because a wait of some minutes gives the client no data about the progress and can time out a proxy. The **`id`** of the record is the part that matters: the client subscribes to the live log stream with it. The life cycle holds four states: `pending → running → success | failed`. [Durable queue](#durable-queue-background-work) gives the run, and [Deployment log store](#deployment-log-store) gives the output.

> **`GET /api/v1/logs?deploymentId=…` gives no history while a deployment runs.** The archive is written one time, at the completion of the run. Use the SSE route to read the output of a run that operates.

## Server-Sent Events (live streams)

To send a long-running result to the client, the application uses Server-Sent Events: one long-lived response that carries one JSON-encoded event for each value. An SSE endpoint always has a REST companion that gives the durable history — the `logs` feature gives this pair twice: once for the events of a deployment, and once for the output of a container that runs (`GET /api/v1/logs/runtime` and `GET /api/v1/logs/runtime/stream`).

A stream endpoint is not public, so it needs a Bearer token. The native `EventSource` API cannot set headers, so the frontend reads the stream with an SSE client that can send one.

**Failure on a stream.** When the connection starts, the response headers are already sent. Thus the error envelope cannot be used, and a stream **never** ends with a failure: it sends a typed `error` event and then completes, with the same `code` vocabulary as the HTTP envelope. The deployment log stream sends one of three events, each JSON-encoded in the `data` field:

```jsonc
{ "type": "line", "data": "<one output line>" }              // one line of output
{ "type": "end", "status": "success" | "failed" }            // the run ended
{ "type": "error", "code": "<code>", "message": "<text>" }   // the log could not be read
```

Only the `line` event and the `end` event are written to the store and archived; the `error` event goes to the subscriber only.

The stream of the runtime logs carries no `end` and no `error` event: it stays open while its container runs, and it closes with no event when the container stops or the client disconnects. It has no terminal status to report, so a failure to reach the daemon at the moment the client subscribes answers `503 Service Unavailable` before the stream opens, instead of a typed `error` event.

### Deployment log store

The output of a deployment has two lives: a **hot** one, where the lines must arrive at the browser immediately, and a **cold** one, where the finished log must stay after the run. One domain port (`LogStore`) gives the four operations of that life cycle — append a line, complete the log with its terminal status, stream it, and purge it. The identifier of the stream is the identifier of the deployment. A Redis Streams adapter implements the port and uses the PostgreSQL logs repository as its archive.

```text
docker output ──append──► Redis stream  logs:<deploymentId>
                              │  └── live tail (XREAD BLOCK) ──► SSE subscriber
                complete ─────┴──► archive to PostgreSQL ──► key expires
```

- **Retention**: a bounded, configurable quantity of lines stays in Redis for each deployment; the archive in PostgreSQL keeps the full history.
- **Read semantics**: one subscription uses one cursor that starts at `0`, so the history arrives before the live tail on the same cursor, with no hand-off to bridge.
- **End of the log**: the terminal entry closes the subscription. Because a run can die without one, the producer also holds a short-lived lease that each append refreshes, so a reader that finds no new entry and no live lease eventually closes the stream instead of waiting for ever.
- **Archive and grace**: `complete()` writes the terminal entry, drops the lease, copies the full stream into PostgreSQL, and keeps the Redis key for a short grace period so a slow subscriber can finish its tail. If the key is already gone, a new subscription replays the archived rows from the database.
- **Removal**: `purge()` deletes the stream key, the lease key and the archived rows, when a deployment or a service is deleted.

### Runtime log store

The output of a container that runs has no terminal status to wait for, so its store keeps no lease and no completion: `RuntimeLogStore` gives the operations to append a line, read the lines already written, stream the lines to come, close the stream of a container that stopped, and flush the batch that waits. The identifier of the stream is the identifier of the container, not of a deployment.

`MemoryRuntimeLogStoreAdapter` (`features/logs/infrastructure/memory/`) holds the lines that wait in an array and fans them out live over one RxJS `Subject` for each container, and it batches the write to the PostgreSQL table `runtime_logs` on the first limit that a batch reaches — `RUNTIME_LOG_FLUSH_SIZE` lines or `RUNTIME_LOG_FLUSH_INTERVAL_MS` milliseconds, whichever comes first. `onModuleDestroy` flushes the lines that still wait, so a shutdown loses none of them.

```text
docker output ──follow──► DockerRuntimeLogFollowerAdapter ──append──► buffer ──flush (size or time)──► PostgreSQL runtime_logs
                                                                 │
                                                                 └──► RxJS Subject ──► SSE subscriber
```

- **The follower** (`DockerRuntimeLogFollowerAdapter`, `features/logs/infrastructure/docker/`) opens one `follow: true` stream of the daemon for each container it is asked to follow, and it keeps the one stream open until it is told to `unfollow` it. The scheduled job `FollowRunningContainersJob` runs every 30 seconds, lists the containers of GitPaaS that run, follows the ones that are new, and unfollows the ones that stopped.
- **A read against the buffer**: `read()` merges the archived rows of PostgreSQL with the lines the buffer still holds, so a caller sees a line before its batch is flushed.
- **Opening a stream follows its container**: the use case `streamRuntimeLogsUseCase` calls `follow()` before it returns the observable, so a client that opens the stream of a container the scheduled job has not reached yet still receives its next line.
- **Retention**: `RemoveExpiredLogsJob` removes the rows of `runtime_logs` older than `RUNTIME_LOGS_RETENTION_DAYS` (seven days by default), on the same hourly schedule and in the same bounded batches as the archive of a deployment.
- **The rate limit**: `GET /api/v1/logs/runtime/stream` uses the throttler named `stream`, and the guard `RuntimeLogStreamGuard` refuses a sixth simultaneous connection of one user (`RUNTIME_LOG_STREAM_MAX_CONNECTIONS`).
- **A daemon that does not answer**: the controller `RuntimeLogsController` turns a failure of the Docker daemon into `503 Service Unavailable`, as the feature of the containers does.

## Authentication

A global guard protects all the routes by default. The `@Public()` decorator marks the routes that need no token — login, refresh, logout, the readiness probe and the root liveness check.

- **Tokens**: at login, the application validates the email and the password (the passwords have an argon2 hash). On each protected request, it validates the Bearer token, finds the user again, and **rejects the accounts that are not active**. Thus a disabled account loses access immediately, and not at the expiry of its token.
- **Rotation**: the refresh tokens stay in the database only as a hash, so a person who reads the table cannot make a token. A refresh operation verifies the signature, the expiry, the row and the hash, then revokes the old row and gives a new pair. A row is revoked and never deleted, so a token that is sent two times is always rejected.

The API has **no public sign-up**; an administrator creates a user with another tool.

### Roles

Each user has a role (`admin` or `user`) in the database. Role-based access control is an **opt-in, per-route guard**, not a global rule: `RolesGuard` (`features/authentication/ui/guards/roles.guard.ts`) reads the roles that the `@Roles(...)` decorator declares on a handler or a controller, and lets an authenticated request through when its role is among them, or when no role is declared at all.

## Docker-facing capabilities

The features that touch Docker use the same arrangement: a domain port gives the capability in business terms, and one infrastructure adapter speaks to the daemon. Thus the use cases stay independent of the container technology. The container runtime is structural, so `core/` owns that port.

- **Deploy**: the operation extracts the source archive, builds or pulls the images the compose file needs, stops the old stack, labels each new resource, starts the stack, and captures a limited quantity of start-up output. It reports each line while it operates, so the run is visible in the live log.
- **Logs**: one port gives the write, the read, the end and the removal of the output of a deployment, and a second port follows the output of a container that runs and gives it the same way. See [Deployment log store](#deployment-log-store) and [Runtime log store](#runtime-log-store).
- **Cleanup**: deleting a deployment or a service removes its log rows and, for a service, the containers, the networks and the images that GitPaaS built. It is best-effort: a daemon failure does not stop the delete operation in the database.
- **Labelling**: GitPaaS uses the same daemon as the control plane and as the third-party stacks, so every resource it creates carries a marker label and a project label. The maintenance operations of the server select only labelled resources, so they never touch the control plane.

## Providers and encrypted credentials

A `provider` row gives a service the credentials it needs to reach its Git host — today only a GitHub App. The domain port `ProviderClient` gives the business operations in provider-agnostic terms — list the reachable repositories, list the branches, resolve a ref to its head commit, download a source archive, verify a set of credentials — and the GitHub adapter implements it over `@octokit/rest`.

**Encryption at rest** is the reason the design keeps a private key out of the database in clear text: the domain port `SecretCipher` gives `encryptSecret`/`decryptSecret`, implemented with AES-256-GCM under a required environment key that is read fresh on every call, with a fresh initialisation vector each time so the same secret never seals to the same payload twice. A lost encryption key makes every stored key unreadable; the only recovery is to register the GitHub Apps again. The read model of a provider never carries the private key, only a fingerprint, so an operator can tell two keys apart without exposing either of them. A secret [service variable](#service-variables) seals under the same key, so the same loss makes it unreadable too.

A service becomes deployable only when it names a provider, a repository and a branch together. The table `services` carries an optional `providerId` with `ON DELETE RESTRICT`, so a provider that a service still names cannot be removed.

### Registering an App from a manifest

GitHub's manifest flow needs two visits to `github.com` and hands back its credentials in two separate steps, so the feature keeps a **pending registration** between them, in its own table, distinct from the `providers` table that means "a provider that operates". A row moves through `awaiting_creation` then `awaiting_installation` as the two use cases `conversion` and `completion` reach GitHub. An operator can abandon the flow at any point, leaving a key with no provider; a scheduled job removes every row past its twelve-hour expiry, without touching the GitHub App itself.

## Service variables

A service holds a set of variables in `features/service-environment/`: a name, a `secret` flag, and a value, validated with the same name shape (capital letters, digits and the low line, no leading digit) that `packages/contracts` fixes for the wire.

- **Encryption at rest**: a secret variable seals its value with the same `SecretCipher` port a provider key uses, before the row is written. The read model never carries the clear value of a secret; a `valueSet` flag alone tells the client that a value exists.
- **Injection at the deployment**: after it fetches the source archive of the run, the deploy use case decrypts every stored variable and merges the result over the `environment` map that the compose file already declares, so a variable of the service overrides a value the compose file gives the same name. When a secret cannot be decrypted, the deployment fails before any Docker work starts.
- **The risk of the compose file**: GitPaaS keeps a secret out of its own logs and out of its API answers, but it does not filter the output a container chooses to print. A compose file whose start-up command echoes its own environment puts the value of that variable into the deployment log, plain or secret alike.

## Error handling

All the failures use one path, from the layer that finds the failure to the JSON that the client reads.

- **`application/`**: a use case finds the business condition and throws a domain error. This is the usual source.
- **`infrastructure/`**: an adapter or a repository can also throw a domain error, but only to change a vendor failure into a business condition, keeping the initial error in `{ cause }`.
- **`ui/services/`**: the services do no error work; they call the use case and let the error go up.
- **`ui/controllers/`**: the controller is the only location that knows HTTP. Its catch block is `throw translateError(error)`.

`core/domain/errors/domain.error.ts` holds the abstract `DomainError` base class. Each subclass gives a stable **`code`** (for example `SERVICE_NOT_FOUND`) that the client relies on instead of the message text. `core/ui/translators/http-error.translator.ts` has one `translateError` function and a translation map, so the controllers do not repeat a catch block: an `HttpException` passes through unchanged, a mapped `DomainError` becomes its mapped exception, and any other error either takes the caller's `unexpected` policy or passes through to become a 500.

### The error envelope

`core/ui/filters/all-exceptions.filter.ts` is a global filter and gives the same JSON shape to each failed request:

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

`code` is the machine-readable identifier the client relies on: the domain error's own code when there is one, otherwise a generic `CLIENT_ERROR` or `SERVER_ERROR`. An unexpected error never gives internal data in the response; the stack stays in the telemetry event.

A global middleware gives each request a correlation id, from the inbound `X-Request-Id` header or freshly made, and returns it on the response and inside the error envelope, so a user can quote it and an operator can find the matching telemetry event. The filter writes no log line itself; it adds `error.*` fields to that event, so a failed request gives one record with the error **and** the duration, the route, the actor and the business identifiers together. See [Telemetry and logging](#telemetry-and-logging).

`src/main.ts` also handles the failures no request can catch: an `unhandledRejection` is logged and the process continues, because the background deployment runner must keep emptying its queue; an `uncaughtException` is logged and stops the process, because its state is no longer known. `src/bootstrap.ts` enables the shutdown hooks, so `SIGTERM` and `SIGINT` close the connections cleanly.

## Telemetry and logging

The backend writes no text line for each step of its work. It writes **one telemetry event for each unit of work**: one flat record, seeded at the start, enriched through the layers, emitted one time at the end as one JSON line on stdout. The two units of work are one HTTP request (`http.request`) and one background deployment run (`deployment.run`).

```text
TelemetryMiddleware ─ seeds the event, opens the scope (runWithTelemetry)
   │  Guard → Controller → Service → Use case → Adapter   each calls enrichTelemetry({ … })
   │  AllExceptionsFilter                                  adds the error.* fields
   └─ response 'finish'/'close' → shouldKeepTelemetryUseCase → writer → one JSON line
```

`runWithTelemetry(seed, work)` runs a unit of work in a fresh scope, and `enrichTelemetry(fields)` adds fields to the event of the current scope, so any layer can add a field without passing the event down as a parameter. `DeploymentRunnerService` opens its own scope for each task, and carries the request id of the caller that queued it, so one trace connects the request to the background run.

An outbound call gets no event of its own: it adds to the counters of the current event instead, for `github`, `docker`, `redis` and `postgres` alike. Postgres is instrumented centrally, so every repository is covered with no work of its own.

**Tail sampling** decides, after the outcome is known, which events are worth keeping at their full rate: an error, a mutation, an auth call, a deployment run, a stream, or a slow request are always kept; a fast, successful `GET` is kept only with a small probability, so a later count can still give the true totals. The reason is cost: keeping every event of a busy `GET` route would swamp the log with the least useful record.

The writer sends one JSON line for each kept event to `process.stdout` and not through `AppLogger`, whose prefix and colour break the machine reading. There is **no persistent store and no query tool**: the retention is the rotation of the Docker log driver, and `docker logs` with a text filter is the tool. Because the log driver splits a very long line, a failure's stack trace is capped when it is written.
