# Infrastructure architecture

This document details the infrastructure on which the GitPaaS application runs.

## Overview

The topology splits into **two planes**, and keeping them separate is the central idea of the design:

- **Control plane**: GitPaaS itself: the backend and frontend applications, a PostgreSQL for durable state and Redis for live logs buffer and pub/sub events.
- **Workload plane**: a remote Docker host where the user's deployed applications run. The control plane never runs user workloads in its own containers; it drives a Docker daemon over the network via mTLS and brings compose stacks up there.

The split holds in both environments; only where the daemon lives and how the control plane is packaged change. Development emulates the workload plane with a Docker-in-Docker container on the developer's machine; production uses a real Docker host.

## Stack

| Concern             | Tool                                                   |
|---------------------|--------------------------------------------------------|
| Orchestration       | Docker Compose (`iac/development/`, `iac/production/`) |
| Images              | Multi-stage Dockerfiles                                |
| Database / cache    | `postgres:17.6-alpine`, `redis:8.8.0-alpine`           |
| Emulated server (dev)  | `docker:29.6.1-dind-alpine`, privileged                |
| Static serving      | nginx-unprivileged                                     |
| Release             | GitHub Actions + semantic-release, images on GHCR      |

## Structure

### Development

`iac/development/docker-compose.yml` (project `gitpaas-dev`) stands up the control plane's dependencies plus a stand-in for the remote server. The backend and frontend themselves run **on the host** via `pnpm dev`, pointing at these services on `127.0.0.1`. Every published port binds to loopback only.

| Service        | Role                                                         | Host port |
|----------------|--------------------------------------------------------------|-----------|
| `server`          | Docker-in-Docker container emulating the remote server           | 2376 (TLS), 8080→80 and 8443→443 reserved for a future proxy |
| `postgres`     | Control-plane database | 5432      |
| `redis`        | Live deployment-log buffer + pub/sub                          | 6379      |
| `pgadmin`      | Optional Postgres web UI, server pre-registered               | 5050      |
| `redisinsight` | Optional Redis web UI, server pre-connected                   | 5540      |

The `server` service runs privileged with `DOCKER_TLS_CERTDIR=/certs`, so its inner daemon listens on `tcp://0.0.0.0:2376` with TLS and generates client certificates under `/certs/client`. `/certs` is bind-mounted to the repo-root `.dev/server-certs`, so `ca.pem` / `cert.pem` / `key.pem` are visible to the host-run backend, which reads them from `SERVER_DOCKER_CERT_PATH` and connects with mutual TLS. Missing certs fail fast, surfaced as `503` with a local-dev hint. Everything GitPaaS deploys lives inside that container, exactly as real workloads live on a remote server; the `server-data` volume persists its images and volumes across restarts.

```text
host: backend (pnpm dev)  ──mTLS──►  127.0.0.1:2376  ──►  DinD daemon
        │                                                   └─ deployed compose stacks
        ├─ 127.0.0.1:5432 ► postgres
        └─ 127.0.0.1:6379 ► redis
```

#### Development admin seeding

The dev Postgres container starts **empty** — it runs no SQL init scripts. On boot with `NODE_ENV=development`, TypeORM `synchronize` provisions the full schema (including the `users` table), then `apps/backend/src/main.ts` triggers the seeding after `app.listen()`: it resolves `UsersService` (`apps/backend/src/features/users/ui/services/users.service.ts`) and calls `seedDevelopmentAdmin()`, which seeds a fixed local admin (`admin@gitpaas.dev` / `gitpaas`). `main.ts` owns the trigger and the `NODE_ENV` gate; the seeding logic itself lives in `UsersService` (the composition edge that injects the concrete adapters), which delegates to the shared `seedAdminUseCase` in `apps/backend/src/features/users/application/seed-admin.ts` — the **same** code path the production installer's CLI uses — so dev and prod seed through one identical mechanism, differing only in their trigger and credentials (dev auto-seeds fixed throwaway creds on boot; prod seeds prompted-email + generated-password via the installer's one-shot CLI).

The seed is idempotent — it looks the admin up by email through the `UsersRepository` port and only creates one when none exists (no raw SQL) — so it is a harmless no-op once the admin exists, and a seed failure is logged without aborting boot. To re-seed, there is no need to recreate the `postgres-data` volume: delete the existing admin row and restart the backend (or simply let the no-op stand if the row is fine).

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
- **Secrets stay out of images.** The mTLS client certs are supplied by a read-only bind mount from `server_CERT_HOST_PATH` into the backend container at `SERVER_DOCKER_CERT_PATH`.
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
| Remote Docker     | `SERVER_DOCKER_HOST`, `SERVER_DOCKER_PORT`, `SERVER_DOCKER_CERT_PATH`, `server_CERT_HOST_PATH`             |
| JWT               | `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`   |

`server_CERT_HOST_PATH` is consumed only by compose; every other variable except the `POSTGRES_*` pair is validated by the backend.

## Installation

### One-line installer

A fresh server becomes a running GitPaaS control plane with a single command:

```sh
curl -fsSL https://raw.githubusercontent.com/GitOpsLovers/gitpaas/main/scripts/install.sh | sh
```

The installer (`scripts/install.sh`) is a dependency-free POSIX `/bin/sh` script. It fails fast (`set -e`), escalates with `sudo` when not run as root, and is safe to re-run: existing certificates and `.env` are preserved, and the admin seed is idempotent. It requires `curl`, `openssl`, and `tar` on the host.

#### Version selection

By default the installer installs `latest`, resolved from the GitHub **latest release** tag, falling back to the newest tag, then to `main` if no releases or tags are reachable (or the API is rate-limited). Pin a specific ref with either a flag or an environment variable:

```sh
# Flag form
curl -fsSL …/install.sh | sh -s -- --version v1.0.0

# Environment form
GITPAAS_VERSION=v1.0.0 sh -c "$(curl -fsSL …/install.sh)"
```

Because the source is fetched from GitHub's `codeload` tarball endpoint, `--version` accepts any tag **or** branch name.

#### Options

Every option is a flag with an environment-variable equivalent:

| Flag | Environment variable | Default | Purpose |
|---|---|---|---|
| `--version <ref>` | `GITPAAS_VERSION` | `latest` | Tag or branch to install. |
| `--dir <path>` | `GITPAAS_DIR` | `/opt/gitpaas` | Install directory the source is unpacked into. |
| `--email <email>` | `GITPAAS_ADMIN_EMAIL` | *(prompted)* | First admin's email; skips the interactive prompt. |
| `--docker-host <host>` | `GITPAAS_DOCKER_HOST` | *(empty)* | Remote Docker host (hostname or IP) to bake into the server cert SAN and into `.env`. |

#### What the installer does

The script runs six ordered steps:

1. **Ensure Docker.** If Docker or the compose plugin is missing, it installs both via the official `get.docker.com` convenience script and enables the daemon.
2. **Resolve version and fetch source.** It resolves the ref (see above) and downloads the repo tarball from `codeload.github.com` into the install directory. An existing install (a directory that already holds `iac/production/docker-compose.yml`) is reused rather than re-fetched.
3. **Generate mTLS material.** It creates a CA, a `clientAuth` certificate for the control plane, and a `serverAuth` certificate for the remote Docker daemon (see [mTLS material](#mtls-material) below).
4. **Write `.env`.** It copies `iac/production/.env.example` to `.env` and fills in secure random secrets — a shared `POSTGRES_PASSWORD`/`DB_PASSWORD`, and `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` (32-byte hex) — sets `NODE_ENV=production`, and points `CORS_ORIGIN` at the host's own address on port `8080`. If `--docker-host` was given it also fills `SERVER_DOCKER_HOST`. GitHub App credentials (and `SERVER_DOCKER_HOST` when not supplied) are left as placeholders.
5. **Bring up the stack.** It runs `docker compose … up -d --build` for the production stack (postgres, redis, the one-shot `migrate` job, backend, frontend), then polls the `gitpaas-backend` container's health until it reports `healthy` (up to ~5 minutes). A healthy backend implies migrations completed, since the backend gates on the `migrate` job.
6. **Seed the first admin.** See [Interactive admin seeding](#interactive-admin-seeding).

On success it prints a summary with the frontend/API URLs, the admin credentials, and the remaining manual follow-ups.

#### mTLS material

The installer generates the same mutual-TLS material the control plane uses to reach the remote Docker daemon (mirroring the dev DinD setup). Under `iac/production/` it writes:

- `certs/` — the **client** side, mounted read-only into the backend (`server_CERT_HOST_PATH`): `ca.pem`, `cert.pem` (a `clientAuth` cert), and `key.pem`.
- `certs-remote-docker/` — the **server** side, for the operator to install on the remote Docker host: `ca.pem`, `server-cert.pem` (a `serverAuth` cert), and `server-key.pem`.

The server certificate's SAN must cover the address the control plane dials. If `--docker-host` is supplied, that host is baked into the SAN (as an `IP:` or `DNS:` entry, plus `localhost`). If it is not, the server cert only covers `localhost`, and the script warns that the operator must regenerate it with a matching SAN once the host address is known.

#### Interactive admin seeding

After the stack is healthy, the installer provisions the **first** administrator. If no email was passed via `--email`/`GITPAAS_ADMIN_EMAIL`, it prompts for one on the controlling terminal (`/dev/tty`, because stdin is the piped script itself). It then generates a random alphanumeric password and runs the compiled seed CLI as a one-shot in the already-built backend image:

```sh
docker compose … run --rm --no-deps \
  -e ADMIN_EMAIL=… -e ADMIN_PASSWORD=… \
  backend node dist/src/features/users/infrastructure/cli/seed-admin.cli.js
```

The seeding CLI adapter `apps/backend/src/features/users/infrastructure/cli/seed-admin.cli.ts` reads `ADMIN_EMAIL`/`ADMIN_PASSWORD` (both required, no fallback), boots a slim Nest context, and resolves `UsersService` to run the shared `seedAdminUseCase` in `apps/backend/src/features/users/application/seed-admin.ts` — the **same** code path the development seeding uses (see [Development admin seeding](#development-admin-seeding)). That routine hashes the password through the `PasswordHasher` port — the shared `Argon2PasswordHasher` adapter provided by the global `CoreModule` (so login verifies it byte-for-byte) — then creates the user with `role=admin` and `isActive=true` through the `UsersRepository` port. It is therefore idempotent: it finds the admin by email first and only creates one when none exists, so re-running with an existing email is a no-op and does **not** rotate the password. Because `synchronize` is disabled in production, this must run after migrations have created the `users` table — the one-shot runs on the `migrate`-gated `backend` image, so the schema is already current. The generated password is printed once in the final summary — it is never stored in readable form, so the operator must copy it immediately.

#### Manual follow-ups

The installer stands up a running control plane, but a working *deployment* target still needs operator input. The summary reminds the operator to, in `iac/production/.env`:

- Fill in the GitHub App credentials: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` (base64-encoded PEM), and `GITHUB_APP_INSTALLATION_ID`.
- Set `SERVER_DOCKER_HOST` (the remote Docker daemon address) — and, if it was not passed via `--docker-host`, regenerate the server certificate with a SAN matching that host.

And, on the remote Docker host:

- Install `certs-remote-docker/{ca,server-cert,server-key}.pem` and configure `dockerd` for mTLS on `:2376`.

After editing `.env`, apply the changes with `docker compose -f <dir>/iac/production/docker-compose.yml up -d`.

> **Known limitation.** The production frontend image bakes `apiBaseUrl: http://localhost:3000/api/v1` at build time, so opening the UI from a machine **other than** the server currently calls the wrong API host. A future frontend build-arg fix will make the API base configurable at install time.

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
| Dev credentials     | The backend seeds `admin@gitpaas.dev` / `gitpaas` on boot (`NODE_ENV=development`) via the shared `seedAdminUseCase`; idempotent, so re-seed by deleting the admin row and restarting — no volume recreation needed. See [Development admin seeding](#development-admin-seeding) |
| Dev schema          | Created by TypeORM `synchronize` on backend boot (dev only)                                    |
| Start prod stack    | `cp .env.example .env`, fill it in, then `docker compose -f iac/production/docker-compose.yml up -d --build` |
| Install on a server    | `curl -fsSL …/scripts/install.sh | sh` — see [Installation](#installation) |
| Prod admin seeding  | The installer seeds the first admin; re-seed via `docker compose … run --rm --no-deps backend node dist/src/features/users/infrastructure/cli/seed-admin.cli.js` (idempotent) |

### Not covered yet

- **Reverse proxy, automatic TLS, and domain routing** for deployed apps — Phase 2.

## Related docs

- [Deployment roadmap](./deployment-roadmap.md)
- [Backend architecture](./backend-architecture.md)
- [Frontend architecture](./frontend-architecture.md)
- [Monorepo architecture](./monorepo-architecture.md)
