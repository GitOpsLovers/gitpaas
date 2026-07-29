# Infrastructure architecture

This document details the infrastructure on which the GitPaaS application runs.

## Overview

GitPaaS runs **entirely on one server**. Two responsibilities still live side by side there:

- **Control plane**: GitPaaS itself: the backend and frontend applications, a PostgreSQL for durable state and Redis for live logs buffer and pub/sub events.
- **Workloads**: the user's deployed applications, run as compose stacks on that same server's Docker daemon.

The backend drives the **local** Docker daemon through the `/var/run/docker.sock` unix socket — bind-mounted into the backend container in production, and the developer's own socket in development. There is no remote daemon, no TCP endpoint and no mTLS material anywhere in the topology.

## Stack

| Concern             | Tool                                                   |
|---------------------|--------------------------------------------------------|
| Orchestration       | Docker Compose (`iac/development/`, `iac/production/`) |
| Images              | Multi-stage Dockerfiles                                |
| Database / cache    | `postgres:17.6-alpine`, `redis:8.8.0-alpine`           |
| Workload execution  | Local Docker daemon via `/var/run/docker.sock`         |
| Static serving      | nginx-unprivileged                                     |
| Release             | GitHub Actions + semantic-release, images on GHCR      |

## Structure

### Development

`iac/development/docker-compose.yml` (project `gitpaas-dev`) stands up the control plane's dependencies. The backend and frontend themselves run **on the host** via `pnpm dev`, pointing at these services on `127.0.0.1`. Every published port binds to loopback only.

| Service        | Role                                            | Host port |
|----------------|-------------------------------------------------|-----------|
| `postgres`     | Control-plane database                          | 5432      |
| `redis`        | Live deployment-log buffer + pub/sub            | 6379      |
| `pgadmin`      | Optional Postgres web UI, server pre-registered | 5050      |
| `redisinsight` | Optional Redis web UI, server pre-connected     | 5540      |

Workloads are **not** emulated: the host-run backend opens `/var/run/docker.sock` directly, so everything GitPaaS deploys locally runs on the developer's own Docker daemon — the same code path as production, with no certificates or extra container to start. The daemon must be running for the Docker-backed endpoints (and the readiness probe) to succeed.

```text
host: backend (pnpm dev)  ──unix socket──►  /var/run/docker.sock
        │                                      └─ deployed compose stacks
        ├─ 127.0.0.1:5432 ► postgres
        └─ 127.0.0.1:6379 ► redis
```

#### Development admin seeding

The dev Postgres container starts **empty** — it runs no SQL init scripts. On boot with `NODE_ENV=development`, TypeORM `synchronize` provisions the full schema (including the `users` table), then `apps/backend/src/main.ts` triggers the seeding after `app.listen()`: it resolves `UsersService` (`apps/backend/src/features/users/ui/services/users.service.ts`) and calls `seedDevelopmentAdmin()`, which seeds a fixed local admin (`admin@gitpaas.dev` / `gitpaas`). `main.ts` owns the trigger and the `NODE_ENV` gate; the seeding logic itself lives in `UsersService` (the composition edge that injects the concrete adapters), which delegates to the shared `seedAdminUseCase` in `apps/backend/src/features/users/application/seed-admin.use-case.ts` — the **same** code path the production installer's CLI uses — so dev and prod seed through one identical mechanism, differing only in their trigger and credentials (dev auto-seeds fixed throwaway creds on boot; prod seeds prompted-email + generated-password via the installer's one-shot CLI).

The seed is idempotent — it looks the admin up by email through the `UsersRepository` port and only creates one when none exists (no raw SQL) — so it is a harmless no-op once the admin exists, and a seed failure is logged without aborting boot. To re-seed, there is no need to recreate the `postgres-data` volume: delete the existing admin row and restart the backend (or simply let the no-op stand if the row is fine).

### Production

`iac/production/docker-compose.yml` (project `gitpaas`) brings up `postgres`, `redis`, a one-shot `migrate` job, `backend`, and `frontend`, with named volumes (`postgres-data`, `redis-data`). The `backend` service bind-mounts the host's `/var/run/docker.sock` so it can drive the server's own Docker daemon, and joins that socket's group via `group_add: ["${DOCKER_GID}"]` because the image runs non-root. Postgres and Redis declare compose healthchecks and the backend gates on them with `depends_on … condition: service_healthy`; the two application images declare their own `HEALTHCHECK`. Only `backend` (`BACKEND_PORT`) and `frontend` (`FRONTEND_PORT`) publish host ports.

The stack **intentionally omits a reverse proxy and TLS termination** — fronting deployed apps with a proxy and automatic TLS is Phase 2 of the roadmap.

Both images build from multi-stage Dockerfiles whose **build context is the repo root**, so the workspace lockfile and manifests are available to a pnpm-in-Turborepo install. Node and pnpm are pinned as build args matching `.tool-versions`. Both final images run non-root.

| Image                        | Stages                                                                                                  |
|------------------------------|----------------------------------------------------------------------------------------------------------|
| `backend.Dockerfile`         | `base` (Node + pnpm) → `build` (install with dev deps, compile, then `pnpm deploy` a prod-only bundle with de-symlinked `node_modules`) → `runtime` (slim, `dist/` + prod deps, `node` user). Healthcheck hits the public `GET /api/v1` via global `fetch`. |
| `frontend.Dockerfile`        | `base` → `build` (static Angular bundle) → `runtime` (nginx-unprivileged on `8080`). `nginx.conf` adds `/healthz`, an SPA history fallback to `index.html`, one-year immutable caching for content-hashed assets, and gzip. |

`.dockerignore` trims the root context to the workspace manifests, the two app source trees, and `nginx.conf`; `node_modules`, build output, and secrets are always excluded and regenerated inside the build stages.

## Conventions

- **Configuration is environment-driven.** `iac/production/.env.example` documents the full contract; the operator copies it to `.env`, which compose auto-loads both for `${…}` interpolation and, via `env_file`, as the backend's runtime configuration. The backend validates every variable at boot and fails fast — no silent fallbacks. A real `.env` is never committed.
- **Secrets stay out of images.** Every credential arrives at runtime through `.env`; nothing sensitive is baked into a layer.
- **Docker access is a mount plus a group.** The daemon is reached through the bind-mounted `/var/run/docker.sock`. Because the backend image runs as the non-root `node` user, the service declares `group_add: ["${DOCKER_GID}"]` — the host's docker group id, detected and written to `.env` by the installer — so the container may use the socket. **Mounting the socket grants the backend effective root on the host** — anything that can talk to the daemon can start a privileged container and take over the machine, so compromising the backend (or any account able to deploy through it) is equivalent to compromising the server. Running the container as a non-root user does not change that. It is the accepted trade-off of the single-server model; the mitigation is to dedicate the host to GitPaaS and treat every GitPaaS user as an operator of it.
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
| Docker            | `DOCKER_GID` (host docker group id; consumed only by compose's `group_add`)                     |
| JWT               | `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`   |

`DOCKER_GID` is consumed only by compose (and is declared required, so the stack refuses to start without it); every other variable except the `POSTGRES_*` pair is validated by the backend.

## Installation

### One-line installer

A fresh server becomes a running GitPaaS control plane with a single command:

```sh
curl -fsSL https://raw.githubusercontent.com/GitOpsLovers/gitpaas/main/scripts/install.sh | sh
```

The installer (`scripts/install.sh`) is a dependency-free POSIX `/bin/sh` script. It fails fast (`set -e`), escalates with `sudo` when not run as root, and is safe to re-run: an existing `.env` is preserved, and the admin seed is idempotent. It requires `curl`, `openssl` (for secret generation), and `tar` on the host.

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

#### What the installer does

The script runs five ordered steps:

1. **Ensure Docker.** If Docker or the compose plugin is missing, it installs both via the official `get.docker.com` convenience script and enables the daemon.
2. **Resolve version and fetch source.** It resolves the ref (see above) and downloads the repo tarball from `codeload.github.com` into the install directory. An existing install (a directory that already holds `iac/production/docker-compose.yml`) is reused rather than re-fetched.
3. **Write `.env`.** It copies `iac/production/.env.example` to `.env` and fills in secure random secrets — a shared `POSTGRES_PASSWORD`/`DB_PASSWORD`, and `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` (32-byte hex) — sets `NODE_ENV=production`, and points `CORS_ORIGIN` at the host's own address on port `8080`. It also detects the host's docker group id (`getent group docker`, falling back to the socket's owning group) and writes it as `DOCKER_GID`, which compose feeds to the backend's `group_add` so the non-root container can use the socket; the installer aborts with a clear message if that GID cannot be resolved. GitHub App credentials are left as placeholders.
4. **Bring up the stack.** It runs `docker compose … up -d --build` for the production stack (postgres, redis, the one-shot `migrate` job, backend, frontend), then polls the `gitpaas-backend` container's health until it reports `healthy` (up to ~5 minutes). A healthy backend implies migrations completed, since the backend gates on the `migrate` job.
5. **Seed the first admin.** See [Interactive admin seeding](#interactive-admin-seeding).

On success it prints a summary with the frontend/API URLs, the admin credentials, and the remaining manual follow-ups.

#### Interactive admin seeding

After the stack is healthy, the installer provisions the **first** administrator. If no email was passed via `--email`/`GITPAAS_ADMIN_EMAIL`, it prompts for one on the controlling terminal (`/dev/tty`, because stdin is the piped script itself). It then generates a random alphanumeric password and runs the compiled seed CLI as a one-shot in the already-built backend image:

```sh
docker compose … run --rm --no-deps \
  -e ADMIN_EMAIL=… -e ADMIN_PASSWORD=… \
  backend node dist/src/features/users/infrastructure/cli/seed-admin.cli.js
```

The seeding CLI adapter `apps/backend/src/features/users/infrastructure/cli/seed-admin.cli.ts` reads `ADMIN_EMAIL`/`ADMIN_PASSWORD` (both required, no fallback), boots a slim Nest context, and resolves `UsersService` to run the shared `seedAdminUseCase` in `apps/backend/src/features/users/application/seed-admin.use-case.ts` — the **same** code path the development seeding uses (see [Development admin seeding](#development-admin-seeding)). That routine hashes the password through the `PasswordHasher` port — the shared `PasswordHasherArgon2Adapter` adapter provided by the global `CoreModule` (so login verifies it byte-for-byte) — then creates the user with `role=admin` and `isActive=true` through the `UsersRepository` port. It is therefore idempotent: it finds the admin by email first and only creates one when none exists, so re-running with an existing email is a no-op and does **not** rotate the password. Because `synchronize` is disabled in production, this must run after migrations have created the `users` table — the one-shot runs on the `migrate`-gated `backend` image, so the schema is already current. The generated password is printed once in the final summary — it is never stored in readable form, so the operator must copy it immediately.

#### Manual follow-ups

The installer stands up a running control plane, but source integration still needs operator input. The summary reminds the operator to, in `iac/production/.env`:

- Fill in the GitHub App credentials: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` (base64-encoded PEM), and `GITHUB_APP_INSTALLATION_ID`.

After editing `.env`, apply the changes with `docker compose -f <dir>/iac/production/docker-compose.yml up -d`.

> **Known limitation.** The production frontend image bakes `apiBaseUrl: http://localhost:3000/api/v1` at build time, so opening the UI from a machine **other than** the server currently calls the wrong API host. A future frontend build-arg fix will make the API base configurable at install time.

## Key flows

### Deployment

A deployment is "bring a service's compose stack up on the server's Docker daemon". The control plane orchestrates it end to end (application-level detail in [backend architecture](./backend-architecture.md)):

```text
POST /deployments ─► persist `pending` ─► enqueue (durable, DB-backed)
        │
        ▼  DeploymentRunnerService (serialized per compose project)
  fetch repo archive at commit (GitHub App)
        │
        ▼  DockerExecutor  ──unix socket──►  local Docker daemon
  build `build:` services / pull the rest ─► down old stack ─► up new stack
        │                                         │
        ▼                                         ▼
  live logs ─► Redis buffer + pub/sub ─► SSE to browser;  history ─► PostgreSQL
```

Infrastructure properties that matter:

- **Durable queue** — tasks are persisted (at-least-once, bounded retries, dead-lettering, restart recovery), so in-flight deployments survive a control-plane restart. Runs serialize per compose-project name while distinct projects run concurrently.
- **Local execution over the Docker socket** — the backend talks to the daemon on `/var/run/docker.sock`, so access is governed by the socket mount and its file permissions rather than by network credentials (and, as noted in [Conventions](#conventions), that access is root-equivalent on the host). The same path is used in development and production.
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
