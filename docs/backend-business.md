# Backend business logic

The core domain workflows of `apps/backend`, in plain terms. For the architecture behind these patterns, see [backend-architecture.md](./backend-architecture.md).

## Domain model

A **project** groups **services**. A service is a deployable unit that references a Git repository, a compose file path, and a deployment branch. A **deployment** is a single attempt to bring a service's Docker Compose stack up on the server. A **user** is an operator who authenticates to use the API.

## Access & authentication

The whole API is **private by default**: every endpoint requires a valid access token, except a small set of public ones (login, token refresh, logout, and the readiness probe). There is **no public sign-up** — users are provisioned by an administrator out of band; the app has no create-user flow.

**Login.** A user posts email + password to `POST /api/v1/auth/login`. Passwords are verified against an argon2 hash. On success the API returns a short-lived **access token** and a longer-lived **refresh token**. Login is rate-limited to slow brute-force attempts.

**Using the API.** Callers send the access token as a Bearer token. Each request re-checks that the user still exists and is **active**, so deactivating a user locks them out immediately rather than at token expiry.

**Refresh with rotation.** When the access token expires, the client exchanges its refresh token at `POST /api/v1/auth/refresh` for a fresh pair. Refresh tokens are stored only as hashes and are **rotated**: each refresh revokes the old token and issues a new one. A token that is reused after rotation (or after logout) is rejected — a replay of a stolen token fails.

**Logout.** `POST /api/v1/auth/logout` revokes a refresh token; it is idempotent. `GET /api/v1/auth/me` returns the current user's public profile.

> Users carry a role (`admin` / `user`), but role-based restrictions are **not enforced yet** — any authenticated user can currently perform any action.

## Deployment workflow

The work is long-running, so it splits into a **fast synchronous request** that records intent and a **background run** that does the work. Three features collaborate: `deployments` (trigger, record, lifecycle, execution), `providers` (GitHub: resolve commits, download source), `logs` (persist and stream output).

**1. Trigger.** `POST /api/v1/deployments` with only a `serviceId`. Everything else is derived server-side. It means "deploy the current head of this service's branch, now".

**2. Validate + prepare** (create-deployment use case, before persisting):

- Service must exist → else `ServiceNotFoundError`.
- Service must be deployable (has a repository and a deployment branch) → else `ServiceNotDeployableError`.
- Resolve the branch head commit via `providers`, pinning the deployment to an exact SHA (+ first line of the message).

Then persist a deployment record with status `pending`, capturing the pinned commit, branch, compose path, and trigger.

**3. Immediate response.** The record — crucially its **`id`** — returns right away, before any Docker work. Blocking for minutes would risk client/proxy timeouts and give no way to observe progress; instead the client subscribes to the live log stream by that id.

**4. Background run.** The use case enqueues a run task on the `DeploymentQueue`. The queue is **durable**: each task is persisted as a row in a queue table, not just held in memory, so pending work survives a process restart. A runner in the same feature picks tasks up and runs each one:

1. Mark `running`.
2. Fetch the repository archive at the pinned commit (gzipped tarball) from `providers`.
3. Run the Docker executor: extract archive, build local `build:` services, pull registry images, tear down the previous stack, bring the new one up — emitting a line of output per step.
4. Mark `success` or `failed`.

The four-state lifecycle is `pending → running → success | failed`.

**Ordering, retries, and recovery.** Runs for the **same compose project** are serialized so a new deploy never races the previous stack's teardown, while different projects still deploy in parallel. If a run fails unexpectedly, the queue **retries** it up to three attempts; once attempts are exhausted the task is **dead-lettered** and its deployment is marked `failed`, so nothing is left stranded in `pending`. On startup the runner **recovers** any unfinished tasks (interrupted mid-run by a restart) and re-runs them. Business-level failures — a build error, an unreachable daemon — are recorded as a `failed` deployment with its logs, not retried.

**5. Logs.** The runner never stores output itself. It fans each executor line to the logs **write port** (`append`) and calls `complete(status)` at the end. Behind the port, `logs` keeps **one** store — the `logs` table — that is both the live buffer and the history:
- Each line gets the next sequence number for that deployment, is published immediately to in-process subscribers, and is batched into the table (written out at 100 lines or 250 ms, whichever comes first). A crash therefore loses at most the last unflushed batch, not the run.
- On `complete`, the terminal `end` entry is written **before** it is published, so a subscriber that joins at that moment still finds it and its stream closes instead of hanging on "running".

Stored output is bounded by two required settings: a per-deployment line cap (`LOGS_MAX_LINES`) trimmed after every flush, and an age window (`LOGS_RETENTION_HOURS`) swept when a deployment completes. The age sweep is opportunistic — there is no scheduler — so a control plane that runs no deployments never prunes by age.

**6. Consume.** With the id from step 3:

- Live: `GET /api/v1/logs/:deploymentId/stream` (SSE) — replays the deployment's stored lines, then tails live ones (deduplicated by sequence), then delivers the terminal `end` event and closes. Connecting mid-run still shows output from the start, and connecting **after** the run finished replays the whole thing and closes cleanly. Like the rest of the API, the stream requires an access token, so the client must use a token-capable SSE reader (plain `EventSource` cannot send an auth header).
- Durable: `GET /api/v1/logs?deploymentId=…` — reads the same persisted rows as a flat, ordered list.

Those two are the feature's whole HTTP surface: `logs` has no CRUD endpoints, because nothing writes log entries except the runner, through the port.

## Deletion & cleanup

- **Delete a deployment** → its log rows are purged, and the DB cascade removes any remainder.
- **Delete a service** → tear down its Docker resources (force-remove labeled containers, compose networks, and images built for it, keeping shared pulled images), purge each deployment's log rows, and let the DB cascade remove deployment + log rows.

## Server maintenance

The `server` feature prunes unused images/volumes/stopped containers on the server and removes orphaned GitPaaS containers whose compose project matches no existing service. It also exposes a public **readiness probe** (`GET /api/v1/server/readiness`) that checks the critical dependencies — PostgreSQL and the Docker daemon.