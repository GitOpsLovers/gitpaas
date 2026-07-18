# Backend business logic

The core domain workflows of `apps/backend`, in plain terms. For the architecture behind these patterns, see [backend-architecture.md](./backend-architecture.md).

## Domain model

A **project** groups **services**. A service is a deployable unit that references a Git repository, a compose file path, and a deployment branch. A **deployment** is a single attempt to bring a service's Docker Compose stack up on the VPS. A **user** is an operator who authenticates to use the API.

## Access & authentication

The whole API is **private by default**: every endpoint requires a valid access token, except a small set of public ones (login, token refresh, logout, and the readiness probe). There is **no public sign-up** — users are provisioned by an administrator out of band; the app has no create-user flow.

**Login.** A user posts email + password to `POST /api/v1/auth/login`. Passwords are verified against an argon2 hash. On success the API returns a short-lived **access token** and a longer-lived **refresh token**. Login is rate-limited to slow brute-force attempts.

**Using the API.** Callers send the access token as a Bearer token. Each request re-checks that the user still exists and is **active**, so deactivating a user locks them out immediately rather than at token expiry.

**Refresh with rotation.** When the access token expires, the client exchanges its refresh token at `POST /api/v1/auth/refresh` for a fresh pair. Refresh tokens are stored only as hashes and are **rotated**: each refresh revokes the old token and issues a new one. A token that is reused after rotation (or after logout) is rejected — a replay of a stolen token fails.

**Logout.** `POST /api/v1/auth/logout` revokes a refresh token; it is idempotent. `GET /api/v1/auth/me` returns the current user's public profile.

> Users carry a role (`admin` / `user`), but role-based restrictions are **not enforced yet** — any authenticated user can currently perform any action.

## Deployment workflow

The work is long-running (download source, build/pull images, start containers), so it splits into a **fast synchronous request** that records intent and a **background run** that does the work. Three features collaborate: `deployments` (trigger, record, lifecycle, execution), `providers` (GitHub: resolve commits, download source), `logs` (buffer, stream, persist output).

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

**5. Logs.** The runner never stores output itself. It fans each executor line to the logs **write port** (`append`) and calls `complete(status)` at the end. Behind the port, `logs`:
- Buffers each line to a **Redis** stream (capped, TTL'd) and publishes it live; each event carries a monotonic seq so a late subscriber can replay then tail without duplicating.
- On `complete`, persists the finished stream to the `logs` **table** (one ordered row per line + a terminal `end` row with the status) and closes the live stream.

**6. Consume.** With the id from step 3:
- Live: `GET /api/v1/logs/:deploymentId/stream` (SSE) — replays the buffer, then tails live lines, then delivers the terminal `end` event and closes. Connecting mid-run still shows output from the start. Like the rest of the API, the stream requires an access token, so the client must use a token-capable SSE reader (plain `EventSource` cannot send an auth header).
- Durable: `GET /api/v1/logs?deploymentId=…` — reads persisted rows, works long after the Redis buffer expires.

## Deletion & cleanup

- **Delete a deployment** → cascade removes its log rows; its Redis logs are purged.
- **Delete a service** → tear down its Docker footprint (force-remove labeled containers, compose networks, and images built for it, keeping shared pulled images), purge each deployment's Redis logs, and let the DB cascade remove deployment + log rows.

## Server maintenance

The `server` feature prunes unused images/volumes/stopped containers on the VPS and removes orphaned Artifactory containers whose compose project matches no existing service. A daemon-unreachable error surfaces as `503`. It also exposes a public **readiness probe** (`GET /api/v1/server/readiness`) that checks the critical dependencies — PostgreSQL, Redis, and the Docker daemon — and returns `503` with a per-dependency breakdown if any is down.
