# Backend business logic

The core domain workflows of `apps/backend`, in plain terms. For the architecture behind these patterns, see [backend-architecture.md](./backend-architecture.md).

## Domain model

A **project** groups **services**. A service is a deployable unit that references a Git repository, a compose file path, and a deployment branch. A **deployment** is a single attempt to bring a service's Docker Compose stack up on the VPS.

## Deployment workflow

The work is long-running (download source, build/pull images, start containers), so it splits into a **fast synchronous request** that records intent and a **background run** that does the work. Three features collaborate: `deployments` (trigger, record, lifecycle, execution), `providers` (GitHub: resolve commits, download source), `logs` (buffer, stream, persist output).

**1. Trigger.** `POST /api/v1/deployments` with only a `serviceId`. Everything else is derived server-side. It means "deploy the current head of this service's branch, now".

**2. Validate + prepare** (create-deployment use case, before persisting):
- Service must exist → else `ServiceNotFoundError`.
- Service must be deployable (has a repository and a deployment branch) → else `ServiceNotDeployableError`.
- Resolve the branch head commit via `providers`, pinning the deployment to an exact SHA (+ first line of the message).

Then persist a deployment record with status `pending`, capturing the pinned commit, branch, compose path, and trigger.

**3. Immediate response.** The record — crucially its **`id`** — returns right away, before any Docker work. Blocking for minutes would risk client/proxy timeouts and give no way to observe progress; instead the client subscribes to the live log stream by that id.

**4. Background run.** The use case enqueues a run task on the `DeploymentQueue`. A runner in the same feature dequeues on module init and runs it:
1. Mark `running`.
2. Fetch the repository archive at the pinned commit (gzipped tarball) from `providers`.
3. Run the Docker executor: extract archive, build local `build:` services, pull registry images, tear down the previous stack, bring the new one up — emitting a line of output per step.
4. Mark `success` or `failed`.

The four-state lifecycle is `pending → running → success | failed`.

**5. Logs.** The runner never stores output itself. It fans each executor line to the logs **write port** (`append`) and calls `complete(status)` at the end. Behind the port, `logs`:
- Buffers each line to a **Redis** stream (capped, TTL'd) and publishes it live; each event carries a monotonic seq so a late subscriber can replay then tail without duplicating.
- On `complete`, persists the finished stream to the `logs` **table** (one ordered row per line + a terminal `end` row with the status) and closes the live stream.

**6. Consume.** With the id from step 3:
- Live: `GET /api/v1/logs/:deploymentId/stream` (SSE) — replays the buffer, then tails live lines, then delivers the terminal `end` event and closes. Connecting mid-run still shows output from the start.
- Durable: `GET /api/v1/logs?deploymentId=…` — reads persisted rows, works long after the Redis buffer expires.

## Deletion & cleanup

- **Delete a deployment** → cascade removes its log rows; its Redis logs are purged.
- **Delete a service** → tear down its Docker footprint (force-remove labeled containers, compose networks, and images built for it, keeping shared pulled images), purge each deployment's Redis logs, and let the DB cascade remove deployment + log rows.

## Server maintenance

The `server` feature prunes unused images/volumes/stopped containers on the VPS and removes orphaned Artifactory containers whose compose project matches no existing service. A daemon-unreachable error surfaces as `503`.
