# Infrastructure architecture

How GitPaaS runs at the infrastructure level, in development and production. For where the platform is headed see [deployment roadmap](./deployment-roadmap.md).

## Overview

The topology splits into **two planes**, and keeping them separate is the central idea of the design:

- **Control plane** — GitPaaS itself: the NestJS backend (API + deploy engine), the Angular SPA served as static files by nginx, and the backend's own stores, PostgreSQL (durable state) and Redis (live log buffer + pub/sub).
- **Workload plane** — a remote Docker host where the user's deployed applications run. The control plane never runs user workloads in its own containers; it drives a Docker daemon over the network via mTLS and brings compose stacks up there.

```text
        Operator / users (browser)
                  │  HTTPS/HTTP
                  ▼
  ┌────────────────────────────────────────┐
  │            CONTROL PLANE               │
  │  frontend (nginx SPA) ── backend (API) │
  │                          │  │          │
  │                 Postgres ┘  └ Redis    │
  └────────────────────────────────────────┘
                  │  Docker Engine API over mTLS (tcp 2376)
                  ▼
  ┌────────────────────────────────────────┐
  │            WORKLOAD PLANE              │
  │  remote Docker daemon                  │
  │   └─ deployed apps (compose stacks)    │
  └────────────────────────────────────────┘
```

The split holds in both environments; only where the daemon lives and how the control plane is packaged change. Development emulates the workload plane with a Docker-in-Docker container on the developer's machine; production uses a real Docker host.

## Stack

| Concern             | Tool                                                      |
|---------------------|-----------------------------------------------------------|
| Orchestration       | Docker Compose (`iac/development/`, `iac/production/`)     |
| Images              | Multi-stage Dockerfiles, build context = repo root         |
| Database / cache    | `postgres:17.6-alpine`, `redis:8.8.0-alpine`               |
| Emulated VPS (dev)  | `docker:29.6.1-dind-alpine`, privileged                    |
| Static serving      | nginx-unprivileged                                         |
| Release             | GitHub Actions + semantic-release, images on GHCR          |

## Structure

### Development

`iac/development/docker-compose.yml` (project `gitpaas-dev`) stands up the control plane's dependencies plus a stand-in for the remote VPS. The backend and frontend themselves run **on the host** via `pnpm dev`, pointing at these services on `127.0.0.1`. Every published port binds to loopback only.

| Service        | Role                                                         | Host port |
|----------------|--------------------------------------------------------------|-----------|
| `vps`          | Docker-in-Docker container emulating the remote VPS           | 2376 (TLS), 8080→80 and 8443→443 reserved for a future proxy |
| `postgres`     | Control-plane database; seeds an admin user on first init     | 5432      |
| `redis`        | Live deployment-log buffer + pub/sub                          | 6379      |
| `pgadmin`      | Optional Postgres web UI, server pre-registered               | 5050      |
| `redisinsight` | Optional Redis web UI, server pre-connected                   | 5540      |

The `vps` service runs privileged with `DOCKER_TLS_CERTDIR=/certs`, so its inner daemon listens on `tcp://0.0.0.0:2376` with TLS and generates client certificates under `/certs/client`. `/certs` is bind-mounted to the repo-root `.dev/vps-certs`, so `ca.pem` / `cert.pem` / `key.pem` are visible to the host-run backend, which reads them from `VPS_DOCKER_CERT_PATH` and connects with mutual TLS. Missing certs fail fast, surfaced as `503` with a local-dev hint. Everything GitPaaS deploys lives inside that container, exactly as real workloads live on a remote VPS; the `vps-data` volume persists its images and volumes across restarts.

```text
host: backend (pnpm dev)  ──mTLS──►  127.0.0.1:2376  ──►  DinD daemon
        │                                                   └─ deployed compose stacks
        ├─ 127.0.0.1:5432 ► postgres
        └─ 127.0.0.1:6379 ► redis
```

### Production

`iac/production/docker-compose.yml` (project `gitpaas`) brings up `postgres`, `redis`, a one-shot `migrate` job, `backend`, and `frontend`, with named volumes (`postgres-data`, `redis-data`). Postgres and Redis declare compose healthchecks and the backend gates on them with `depends_on … condition: service_healthy`; the two application images declare their own `HEALTHCHECK`. Only `backend` (`BACKEND_PORT`) and `frontend` (`FRONTEND_PORT`) publish host ports.

The stack **intentionally omits a reverse proxy and TLS termination** — fronting deployed apps with a proxy and automatic TLS is Phase 2 of the roadmap.

Both images build from multi-stage Dockerfiles whose **build context is the repo root**, so the workspace lockfile and manifests are available to a pnpm-in-Turborepo install. Node and pnpm are pinned as build args matching `.tool-versions`. Both final images run non-root.

| Image                        | Stages                                                                                                  |
|------------------------------|----------------------------------------------------------------------------------------------------------|
| `backend.Dockerfile`         | `base` (Node + pnpm) → `build` (install with dev deps, compile, then `pnpm deploy` a prod-only bundle with de-symlinked `node_modules`) → `runtime` (slim, `dist/` + prod deps, `node` user). Healthcheck hits the public `GET /api/v1` via global `fetch`. |
| `frontend.Dockerfile`        | `base` → `build` (static Angular bundle) → `runtime` (nginx-unprivileged on `8080`). `nginx.conf` adds `/healthz`, an SPA history fallback to `index.html`, one-year immutable caching for content-hashed assets, and gzip. |

`.dockerignore` trims the root context to the workspace manifests, the two app source trees, and `nginx.conf`; `node_modules`, build output, and secrets are always excluded and regenerated inside the build stages.

## Conventions

- **Configuration is environment-driven.** `iac/production/.env.example` documents the full contract; the operator copies it to `.env`, which compose auto-loads both for `${…}` interpolation and, via `env_file`, as the backend's runtime configuration. The backend validates every variable at boot and fails fast — no silent fallbacks. A real `.env` is never committed.
- **Secrets stay out of images.** The mTLS client certs are supplied by a read-only bind mount from `VPS_CERT_HOST_PATH` into the backend container at `VPS_DOCKER_CERT_PATH`.
- **Version pins live in one place** (`.tool-versions`) and flow into the compose build args and CI.
- **Production never auto-creates schema.** `NODE_ENV=production` disables TypeORM `synchronize`; migrations own the schema.

### Environment contract

| Group             | Variables                                                                                     |
|-------------------|-----------------------------------------------------------------------------------------------|
| Build / ports     | `NODE_VERSION`, `PNPM_VERSION`, `IMAGE_TAG`, `BACKEND_PORT`, `FRONTEND_PORT`                   |
| Backend runtime   | `NODE_ENV`, `PORT`, `CORS_ORIGIN`, `THROTTLE_TTL`, `THROTTLE_LIMIT`, `THROTTLE_STREAM_TTL`, `THROTTLE_STREAM_LIMIT` |
| PostgreSQL        | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` |
| Redis             | `REDIS_HOST`, `REDIS_PORT`                                                                     |
| GitHub App        | `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` (base64 PEM), `GITHUB_APP_INSTALLATION_ID`           |
| Remote Docker     | `VPS_DOCKER_HOST`, `VPS_DOCKER_PORT`, `VPS_DOCKER_CERT_PATH`, `VPS_CERT_HOST_PATH`             |
| JWT               | `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`   |

`VPS_CERT_HOST_PATH` is consumed only by compose; every other variable except the `POSTGRES_*` pair is validated by the backend.

## Key flows

### Deployment (workload plane)

A deployment is "bring a service's compose stack up on the remote Docker host". The control plane orchestrates it end to end (application-level detail in [backend architecture](./backend-architecture.md)):

```text
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

Infrastructure properties that matter:

- **Durable queue** — tasks are persisted (at-least-once, bounded retries, dead-lettering, restart recovery), so in-flight deployments survive a control-plane restart. Runs serialize per compose-project name while distinct projects run concurrently.
- **Remote execution over mTLS** — the trust relationship is the crux of the topology: the control plane holds a client certificate signed by the daemon's CA, so only GitPaaS can drive that daemon, and it verifies the daemon's server certificate in turn. In development the DinD container generates the pair; in production the operator supplies it.
- **Live plus durable logs** — output streams to the browser over SSE via Redis and is persisted to PostgreSQL for replayable history.

The same daemon backs the read-only operational features (container and network inspection, pruning, orphan cleanup) and the readiness probe, which checks PostgreSQL, Redis, and the Docker daemon in parallel.

### Schema bootstrap

The one-shot `migrate` service reuses the backend image (compiled migrations and DataSource ship inside `dist/`), waits for Postgres to be healthy, runs the TypeORM CLI's `migration:run` against the compiled DataSource once, then exits. `backend` gates on it with `depends_on … condition: service_completed_successfully`, so it starts only after the schema is current.

### Release and image publishing

`.github/workflows/release.yml` is manually triggered (`workflow_dispatch`) and runs two gated jobs:

1. **release** — semantic-release (v24, config in `.releaserc.json`, branch `main`) reads the Conventional Commits since the last tag, computes the next version, and creates the git tag plus GitHub Release. It exposes whether a release happened and the resolved version.
2. **publish** — runs only if a release was cut. With Buildx + QEMU it builds and pushes multi-arch (`linux/amd64,linux/arm64`) backend and frontend images to GHCR, tagged with the exact version and `latest`, with provenance and SBOM attestations.

Token scopes are least-privilege (`contents`, `packages`, plus issues/PRs for release comments). The resulting images are public:

```text
ghcr.io/gitopslovers/gitpaas-backend:{version|latest}
ghcr.io/gitopslovers/gitpaas-frontend:{version|latest}
```

Versioning is entirely commit-driven: `fix:` → patch, `feat:` → minor, breaking change → major.

## Operations

| Task                | How                                                                                          |
|---------------------|-----------------------------------------------------------------------------------------------|
| Start dev stack     | `docker compose up -d` from `iac/development/`, then `pnpm dev` at the repo root               |
| Dev credentials     | A fresh `postgres-data` volume seeds `admin@gitpaas.dev` / `gitpaas` via `postgres/init/`; re-seed by recreating the volume |
| Dev schema          | Created by TypeORM `synchronize` on backend boot (dev only)                                    |
| Start prod stack    | `cp .env.example .env`, fill it in, then `docker compose -f iac/production/docker-compose.yml up -d --build` |

### Not covered yet

- **Reverse proxy, automatic TLS, and domain routing** for deployed apps — Phase 2.
- **A one-line installer** — a later Phase 1 slice.
- **Production admin seeding** — the admin seed is dev-only Postgres init SQL, so the first production admin must be provisioned out-of-band until the installer lands.

## Related docs

- [Deployment roadmap](./deployment-roadmap.md)
- [Backend architecture](./backend-architecture.md)
- [Frontend architecture](./frontend-architecture.md)
- [Monorepo architecture](./monorepo-architecture.md)
