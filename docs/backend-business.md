# Backend business logic

This document describes the **business workflows** of the backend app (`apps/backend`) end to end: what the user is trying to achieve, which features collaborate, and how a request flows through them over time. It focuses on the *workflow* — the sequence of responsibilities and the data that travels between them — not the architecture. For the architectural rationale behind the patterns used here, see [`backend-architecture.md`](docs/backend-architecture.md).

## Service deployment workflow

A deployment is a single attempt to bring a service's Docker Compose stack up on the host. The work is inherently long-running — downloading source, building images, pulling images, and starting containers — so the workflow is split into a **fast synchronous request** that only records intent and a **background run** that does the heavy lifting. The client observes progress by streaming the run's log output. Three features collaborate:

- **`deployments`** — owns triggering, the deployment record and its lifecycle status, and the actual run execution.
- **`providers`** — the GitHub integration that resolves commits and downloads repository source.
- **`logs`** — a leaf "output" feature that buffers, streams and persists the run's log lines.

### 1. Trigger

A client starts a deployment with `POST /api/v1/deployments`. The request body identifies **only the service to deploy** — a single `serviceId` (a UUID). It carries no branch, commit or configuration: everything else is derived server-side from the service's own settings. The request represents the intent "deploy the current head of this service's configured branch, now".

### 2. Validation and preparation

The controller hands the validated DTO to the deployments service, which runs the create-deployment use case. That use case prepares the deployment in three steps, all before anything is persisted:

1. **The service must exist.** It loads the target service; a missing service raises a `ServiceNotFoundError`.
2. **The service must be deployable.** It must have both a linked repository and a configured deployment branch. A service missing either raises a `ServiceNotDeployableError`.
3. **Resolve the head commit.** It asks the `providers` (GitHub) integration to resolve the service's deployment branch to its head commit, capturing the commit SHA and the first line of its message. This pins the deployment to an exact commit rather than a moving branch ref.

With validation passed and the commit resolved, the use case **persists a deployment record**. The record starts life with an initial `pending` status and captures the pinned commit, branch, compose path and who triggered it.

### 3. Immediate response

The persisted deployment record — crucially, **its `id`** — is returned to the client right away, before the run does any work. The run is fire-and-forget: the HTTP request does not wait for Docker.

This is deliberate. Building images and starting containers can take minutes; blocking the HTTP response for that long would tie up the connection, risk client and proxy timeouts, and give the caller no way to observe progress. Returning the `id` immediately lets the client acknowledge the deployment and then **subscribe to its live log stream by that id** (step 5) while the run proceeds in the background.

### 4. Background execution

To kick off the run without waiting for it, the create-deployment use case enqueues a **run task** on the `DeploymentQueue` and returns. The producer only announces "please run this deployment"; it never learns when or how the run finishes.

A background runner **inside the same deployments feature** — a service that dequeues from the queue on module init — picks up each task and drives the run through the run-deployment use case. The run:

1. **Marks the deployment `running`.**
2. **Fetches the repository archive** from the `providers` integration: the source at the pinned commit, as a gzipped tarball.
3. **Runs the Docker build/up** through the Docker executor, which extracts the archive, builds any local `build:` services, pulls registry images, tears down the previous containers and brings the stack up — emitting a line of output at each step.
4. **Marks the deployment `success` or `failed`.**

### 5. Log output and streaming

The runner never stores log output itself. As the Docker executor produces each line, the run fans that line out to the `logs` feature through its **write port** (`append`). At the end of the run it calls `complete` with the terminal status. That write port is the entire surface the deployments feature touches; how lines are buffered, streamed and stored is entirely internal to `logs`.

Behind the port, the logs feature:

- **Buffers each appended line to a Redis-backed stream** and publishes it live to any subscribers. The Redis buffer is capped and given a TTL, and each event carries a monotonic sequence number so a late subscriber can replay the buffer and then switch to live output without duplicating or reordering lines.
- **On `complete`, persists the finished stream to the `logs` table** — one ordered row per line followed by a terminal `end` row carrying the status — and **closes the live stream** by publishing the terminal `end` event.

### 6. Consuming logs

With the `id` returned in step 3, the client watches the run in real time by opening the live log stream over **Server-Sent Events**:

```
GET /api/v1/logs/:deploymentId/stream
```

The stream first **replays the buffered output** captured so far, then **tails live lines** as the run produces them, and finally delivers a terminal `end` event (carrying `success` or `failed`) and closes when the run completes. Because replay comes first, a client that connects mid-run — or a moment after triggering — still sees the full output from the beginning.

The durable history is available at any time, independent of the live stream, through the ordinary logs list endpoint:

```
GET /api/v1/logs?deploymentId=…
```

This reads the persisted `logs` rows, so it works long after the run has finished and the Redis buffer has expired.

**The client sequence, end to end:**

1. `POST /api/v1/deployments` with a `serviceId`.
2. Receive the created deployment and read its **`id`**.
3. Open `GET /api/v1/logs/:deploymentId/stream` with that id to watch the run live.
4. Later, read `GET /api/v1/logs?deploymentId=…` for durable history.