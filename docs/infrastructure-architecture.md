# Infrastructure Architecture

This document describes how GitPaaS runs at the **infrastructure level**, in both development and production. For the application internals see [backend-architecture.md](./backend-architecture.md) and [frontend-architecture.md](./frontend-architecture.md); for where the platform is headed see [deployment-roadmap.md](./deployment-roadmap.md).

## Overview: two planes

GitPaaS is a self-hostable PaaS, and its topology splits cleanly into two planes.
Keeping them separate is the single most important idea in the infrastructure design.

- **Control plane** — GitPaaS *itself*: the NestJS backend (API + deploy engine), the Angular SPA (served as static files by nginx), and the backend's own data stores,   **PostgreSQL** (durable state) and **Redis** (live log buffer + pub/sub). This is the app the operator installs and logs into.
- **Workload plane** — a **remote Docker host** where the user's deployed applications actually run. The control plane never runs user workloads in its own containers; it drives a Docker daemon reached **over the network via mTLS** and brings compose stacks up there.

```
        Operator / Users (browser)
                  │  HTTPS/HTTP
                  ▼
  ┌────────────────────────────────────────┐
  │            CONTROL PLANE               │
  │  frontend (nginx SPA) ── backend (API) │
  │                          │  │          │
  │                 Postgres ┘  └ Redis    │
  └───────────────────────────────────────┘
                  │  Docker Engine API over mTLS (tcp 2376)
                  ▼
  ┌────────────────────────────────────────┐
  │            WORKLOAD PLANE              │
  │  remote Docker daemon                  │
  │   └─ deployed apps (compose stacks)    │
  └────────────────────────────────────────┘
```

The same split holds in development and production; only *where the daemon lives* and *how the control plane is packaged* change. In development the workload plane is an emulated VPS running on the developer's machine; in production it is a real remote (or co-located) Docker host.

## Development infrastructure

The local stack lives in `iac/development/docker-compose.yml` (compose project `gitpaas-dev`). It stands up the control plane's dependencies plus a stand-in for the remote VPS, while the backend and frontend themselves run **on the host** via `pnpm dev` (Turborepo), pointing at these services on `127.0.0.1`. Every published port is bound to loopback only.

| Service                    | Role                                                                             |
|----------------------------|----------------------------------------------------------------------------------|
| `vps`                      | Docker-in-Docker (DinD) container emulating the **remote VPS** (workload plane). |
| `postgres`                 | The control plane's own database; seeds an admin user on first init.             |
| `redis`                    | Live deployment-log buffer + pub/sub.                                            |
| `pgadmin` / `redisinsight` | Optional web UIs to inspect Postgres / Redis.                                    |

### The emulated VPS (DinD) and mTLS

The `vps` service runs `docker:dind` **privileged**, with `DOCKER_TLS_CERTDIR=/certs`.
That makes its inner daemon listen on `tcp://0.0.0.0:2376` **with TLS** and generate client certificates under `/certs/client`. Two things make it usable as a workload plane:

- The daemon's TLS port is published at `127.0.0.1:2376`, so the host-run backend can reach it over the Docker Engine API.
- `/certs` is bind-mounted to the repo-root `./.dev/vps-certs`, so the generated **client certificates** (`ca.pem`, `cert.pem`, `key.pem`) are visible to the backend. The backend's `DockerClient` reads them from `VPS_DOCKER_CERT_PATH` and connects with **mutual TLS** — the client proves its identity to the daemon and vice-versa. If the certs are missing, the client fails fast (surfaced as `503` with a local-dev hint).

Everything GitPaaS deploys therefore lives *inside* the DinD container, exactly as real workloads would live on a remote VPS. A named volume (`vps-data`) persists the emulated host's images/volumes across restarts. The DinD container also **reserves host ports `8080`→`80` and `8443`→`443`** for the future reverse proxy (Phase 2); nothing routes to deployed apps yet.

```
host: backend (pnpm dev)  ──mTLS──►  127.0.0.1:2376  ──►  DinD daemon
        │                                                    └─ deployed compose stacks
        ├─ 127.0.0.1:5432 ► postgres
        └─ 127.0.0.1:6379 ► redis
```

### Running it

Bring the stack up with docker compose from `iac/development/`, then run the apps on the host with `pnpm dev`. On a fresh `postgres-data` volume, the init script seeds `admin@gitpaas.dev` / `gitpaas` so login works immediately. Schema is created by TypeORM `synchronize` on backend boot (dev-only; see below).

## Production infrastructure

The production control-plane stack lives in `iac/production/` (compose project `gitpaas`). It brings up `backend`, `frontend`, `postgres`, and `redis` — with named volumes for data (`postgres-data`, `redis-data`), healthchecks on every long-running service, and `depends_on … condition: service_healthy` gating so the backend only starts once its data stores are ready. It also adds a **one-shot `migrate` service** that bootstraps the schema before the backend starts (see below).

This stack **intentionally omits a reverse proxy / TLS termination**; host ports are published directly (`BACKEND_PORT`, `FRONTEND_PORT`). Fronting the deployed apps with a proxy and automatic TLS is Phase 2 of the roadmap.

### The two images

Both images build from **multi-stage Dockerfiles** whose **build context is the repo root**, so the workspace lockfile and manifests are available to a pnpm-in-Turborepo install. Node is pinned to `26.1.0` and pnpm to a fixed version (build args, matching `.tool-versions`). Both final images run **non-root** and declare a `HEALTHCHECK`.

- **Backend** (`backend.Dockerfile`) — `base` (Node + pnpm) → `build` (install with dev deps, compile, then `pnpm deploy` a self-contained, prod-only bundle with a de-symlinked `node_modules`) → `runtime` (slim image carrying only `dist/` + prod `node_modules`, running as the `node` user). Its healthcheck hits the public `GET /api/v1` endpoint via Node's global `fetch`.
- **Frontend** (`frontend.Dockerfile`) — `base` → `build` (produce the static Angular bundle) → `runtime` (**nginx-unprivileged**, non-root, listening on `8080`) serving the pre-built files. `nginx.conf` adds a `/healthz` liveness endpoint, an SPA history-fallback to `index.html`, long-lived caching for content-hashed assets, and gzip.

The `.dockerignore` trims the root build context to just the workspace manifests, the two app source trees, and the frontend's `nginx.conf`; `node_modules`, build output, and secrets are always excluded and regenerated inside the build stages.

### Configuration and secrets

All configuration is **environment-driven**, documented by `iac/production/.env.example` (the operator copies it to `.env`). Compose auto-loads `.env` from the directory for both `${...}` interpolation and, via `env_file`, as the backend's runtime configuration. The contract spans: host port bindings; backend runtime (`NODE_ENV`, `PORT`, `CORS_ORIGIN`, throttling); PostgreSQL and the backend's DB connection; Redis; the GitHub App (id, base64 PEM key, installation id); the remote Docker mTLS settings; and the JWT secrets/lifetimes. The backend validates the whole set at boot and **fails fast** on anything missing or invalid — there are no silent fallbacks. A real `.env` is never committed.

The mTLS client certs (`ca.pem` / `cert.pem` / `key.pem`) are supplied by a **read-only bind mount** from a host path (`VPS_CERT_HOST_PATH`) into the backend container at `VPS_DOCKER_CERT_PATH`, keeping key material out of the image.

### Schema bootstrap (migrations)

With `NODE_ENV=production` the backend **disables** TypeORM `synchronize`, so the schema is owned by **versioned migrations** rather than created at app boot. The stack applies them with a **one-shot `migrate` service**: it reuses the backend image (the compiled migrations and DataSource ship inside `dist/`), waits for Postgres to be healthy, runs the TypeORM CLI's `migration:run` against the **compiled** DataSource once, then exits. The `backend` service gates on it with `depends_on … condition: service_completed_successfully`, so it only starts after the schema is up to date. Postgres, Redis, and the frontend are unaffected by this step.

### What is intentionally not here yet

- **Reverse proxy / automatic TLS / domain routing** for *deployed apps* — Phase 2.
- **A one-line installer** — a later Phase 1 slice. Migrations now bootstrap the schema automatically, but **production admin seeding is still not handled**: the existing admin seed is dev-only Postgres init SQL, so the first admin must be provisioned out-of-band until the installer lands. See the roadmap for the plan and the interim workaround.

## Release and image publishing

Images are published by a **manually triggered** GitHub Actions workflow (`.github/workflows/release.yml`, `workflow_dispatch`) in two gated jobs:

1. **release** — `semantic-release` (v24, config in `.releaserc.json`, branch `main`) reads the **Conventional Commits** since the last tag, computes the next semantic version, and creates the git tag + GitHub Release. It exposes whether a release happened and the resolved version.
2. **publish** — runs **only if** a release was cut. Using Buildx + QEMU, it builds and pushes **multi-arch** (`linux/amd64,linux/arm64`) backend and frontend images to the GitHub Container Registry, tagged with the exact version and `latest`, with build provenance and SBOM attestations. Same Node/pnpm pins as the Dockerfiles.

The workflow uses least-privilege token scopes (`contents`, `packages`, plus issues/PRs for release comments). The resulting images are **public**:

```
ghcr.io/gitopslovers/gitpaas-backend:{version|latest}
ghcr.io/gitopslovers/gitpaas-frontend:{version|latest}
```

Versioning is thus entirely commit-driven: `fix:` → patch, `feat:` → minor, a breaking change → major.

## Runtime deployment model (workload plane)

At an infrastructure level, a deployment is "bring a service's compose stack up on the remote Docker host." The control plane orchestrates it end to end:

```
POST /deployments ─► persist `pending` ─► enqueue (durable, DB-backed)
        │
        ▼  DeploymentRunnerService (serialized per compose project)
  fetch repo archive at commit (GitHub App)
        │
        ▼  DockerExecutor  ──mTLS──►  remote Docker daemon
  build `build:` services / pull the rest ─► down old stack ─► up new stack
        │                                         │
        ▼                                         ▼
  live logs ─► Redis buffer + pub/sub ─► SSE to browser;  history ─► PostgreSQL
```

Key infrastructure properties:

- **Durable queue.** Tasks are persisted (at-least-once, bounded retries, dead-lettering, restart recovery), so in-flight deployments survive a control-plane restart. Runs are   serialized **per compose-project name** while distinct projects run concurrently.
- **Remote execution over mTLS.** The executor talks to the Docker daemon through the same `DockerClient` used everywhere — Dockerode over TLS, authenticating with the mounted client certificate. The trust relationship is the crux of the topology: the control plane holds a **client certificate signed by the daemon's CA**, so only GitPaaS can drive that daemon, and it verifies the daemon's server certificate in turn. In development this CA/cert pair is generated by the DinD container; in production it is supplied by the operator (today) and by the installer (future Phase 1).
- **Live + durable logs.** Output streams live to the browser over Server-Sent Events via Redis, and is persisted to PostgreSQL for replayable history after the run ends.

The same daemon backs the read-only operational features (container/network inspection, pruning, orphan cleanup) and the readiness probe, which checks PostgreSQL, Redis, and the Docker daemon in parallel.

## How it fits together / roadmap pointer

The control plane is packaged and shipped as two public GHCR images and stood up with a small, env-driven compose stack that migrates its own schema on start-up; the workload plane is any Docker host it can reach over mTLS. Development mirrors this exactly, substituting a privileged DinD "vps" for the real remote host. The gaps that turn this from a working single-tenant engine into a full self-host PaaS — the one-line installer (the rest of Phase 1), a reverse proxy with automatic TLS and domain routing (Phase 2), and beyond — are tracked in [deployment-roadmap.md](./deployment-roadmap.md).
