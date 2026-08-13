# Key flows

## Request

All the requests move through the layers in the same sequence, from the HTTP edge to the persistence and back:

```text
HTTP → ValidationPipe → Controller → Service → Use Case → Repository port ◄ adapter → PostgreSQL
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

A successful run deletes the row, because the deployment record holds the durable result. A failure records the error and queues the task again, up to three attempts. After the last attempt, the task goes to the dead-letter state **and** the deployment becomes `failed`, so no deployment stays `pending` for ever. At start-up, each unfinished task returns to `queued`, so work that a crash interrupted runs again.

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
- **Retention**: each append writes the entry with an approximate `MAXLEN` trim, from the necessary `LOGS_MAX_LINES` variable. Thus Redis holds a bounded quantity of lines for each deployment. A value of zero disables the trim.
- **Read semantics**: one subscription uses one cursor. It starts at `0`, so the history arrives before the live tail on the same cursor, and there is no hand-off to bridge and nothing to remove twice. The reads block on a **dedicated blocking connection**, so a long read does not stall the other commands.
- **End of the log**: the terminal entry closes the subscription. Because a run can die without one, the producer also holds a short-lived lease that each append refreshes. If a blocking read finds no new entry and the lease is gone for two rounds, the reader closes the subscription. Thus no client waits for ever.
- **Archive and grace**: `complete()` writes the terminal entry, drops the lease, copies the full stream into PostgreSQL (the position in the stream gives the `seq` column), and then sets a short expiry on the key. The delay only lets a slow subscriber finish the tail that it reads. If the stream key is already gone, a new subscription replays the archived rows from the database and completes.
- **Removal**: `purge()` deletes the stream key, the lease key and the archived rows. The delete operations of a deployment and of a service call it.
- **Consumers**: the deploy use case sends each captured line to `append()` and calls `complete()` with `success` or `failed`; a failure also appends the error line first. The API gives the live view with an SSE endpoint that JSON-encodes each event, and the durable history with a `GET /logs?deploymentId=` endpoint that reads the archive. An append failure is logged and does not stop the run.

## Authentication

A global guard protects all the routes by default. A metadata flag makes a route public — the login and the refresh operations, because the caller has no access token at that moment. The login endpoint is rate-limited.

- **Tokens**: at login, the application validates the email and the password (the passwords have an argon2 hash). On each protected request, it validates the Bearer token, finds the user again, and **rejects the accounts that are not active**. Thus a disabled account loses access immediately, and not at the expiry of its token. The two token types use different secrets and lifetimes.
- **Rotation**: the refresh tokens stay in the database only as a hash, so a person who reads the table cannot make a token. A refresh operation verifies the signature, the expiry, the row and the hash, verifies again that the user is active, and then revokes the old row and gives a new pair. A row is revoked and never deleted, so a token that is sent two times is always rejected.

> RBAC is not implemented yet. Each user has a role (`admin` or `user`) in the database, but no authorization guard uses it.

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

`core/ui/filters/all-exceptions.filter.ts` is a global filter (`APP_FILTER`) and gives the same JSON shape to each failed request.

An unexpected error never gives internal data: the message becomes `Internal server error`, and the stack stays in the log.

This is the readiness probe: the controller throws `ServiceUnavailableException(result)`, and thus the breakdown of each dependency stays in `details` and is not lost. The `code` is the generic server code, because a readiness failure has no domain error and its status is a 5xx.

### Correlation id

`core/ui/middlewares/request-id.middleware.ts` operates before all the other middleware. It takes the inbound `X-Request-Id` header if the value is one clean, not empty string of 128 characters or less; if not, it makes a UUID. Then it writes the id back on the request headers, so each later consumer reads one value that is already resolved, and it sets the `X-Request-Id` response header. The filter puts the same id in the envelope and at the start of the log line. Thus a user can quote the id, and you can find the failure in the server log.

### Logging a failure

The filter writes the only log line of a failed request:

- A 5xx goes to the `error` level with the stack. The filter follows the `{ cause }` chain and adds each cause with a `Caused by:` prefix. Thus the log shows the initial failure and not only the exception that the translator made. A cycle in the chain cannot make a loop.
- A 4xx goes to the `warn` level with the message and with no stack.

Thus a controller must not log the failure that it translates. If it did, the log would have the same failure two times, and the second time with no request id.

### Deviations

The Passport strategies (`features/authentication/infrastructure/passport/jwt.strategy.ts` and `local.strategy.ts`) throw `UnauthorizedException` and do not use the translator. The guard operates before each controller method, so no controller can do the translation there.

### Process-level failures

`src/main.ts` puts a handler on the process for the failures that no request can catch:

- `unhandledRejection` writes an `error` log and lets the process continue, because the background deployment runner must continue to empty its queue.
- `uncaughtException` writes an `error` log and stops the process with the code 1, because the state of the process is not known after such an error.

`src/bootstrap.ts` calls `app.enableShutdownHooks()`, and thus `SIGTERM` and `SIGINT` in a container go to the `onModuleDestroy` hooks of the modules and the connections close in a clean way.
