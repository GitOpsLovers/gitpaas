# Infrastructure architecture

This document details the infrastructure on which the GitPaaS application runs.

## Overview

GitPaaS runs **entirely on one server**. Two responsibilities still live side by side there:

- **Control plane**: GitPaaS itself: the backend and frontend applications, plus a PostgreSQL that holds all durable state — including deployment logs, which are both the live stream's buffer and its history.
- **Workloads**: the user's deployed applications, run as compose stacks on that same server's Docker daemon.

The backend drives the **local** Docker daemon through the `/var/run/docker.sock` unix socket — bind-mounted into the backend container in production, and the developer's own socket in development. There is no remote daemon, no TCP endpoint and no mTLS material anywhere in the topology.

## Stack

| Concern             | Tool                                                   |
|---------------------|--------------------------------------------------------|
| Orchestration       | Docker Compose (`iac/development/`, `iac/production/`) |
| Images              | Multi-stage Dockerfiles                                |
| Database            | `postgres:17.6-alpine`                                 |
| Workload execution  | Local Docker daemon via `/var/run/docker.sock`         |
| Static serving      | nginx-unprivileged                                     |
| Release             | GitHub Actions + semantic-release, images on GHCR      |

## Structure

### Development

`iac/development/docker-compose.yml` (project `gitpaas-dev`) stands up the control plane's dependencies. The backend and frontend themselves run **on the host** via `pnpm dev`, pointing at these services on `127.0.0.1`. Every published port binds to loopback only.

| Service        | Role                                            | Host port |
|----------------|-------------------------------------------------|-----------|
| `postgres`     | Control-plane database                          | 5432      |
| `pgadmin`      | Optional Postgres web UI, server pre-registered | 5050      |

Workloads are **not** emulated: the host-run backend opens `/var/run/docker.sock` directly, so everything GitPaaS deploys locally runs on the developer's own Docker daemon — the same code path as production, with no certificates or extra container to start. The daemon must be running for the Docker-backed endpoints (and the readiness probe) to succeed.

```text
host: backend (pnpm dev)  ──unix socket──►  /var/run/docker.sock
        │                                      └─ deployed compose stacks
        └─ 127.0.0.1:5432 ► postgres
```

#### Admin seeding

The dev Postgres container starts **empty**. On Backend application boot, TypeORM `synchronize` provisions the full schema and triggers the seeding with the credentials `admin@gitpaas.dev` / `gitpaas`.

### Production

`iac/production/docker-compose.yml` (project `gitpaas`) brings up `postgres`, `backend`, and `frontend`, with a single named volume (`postgres-data`). The `backend` service bind-mounts the host's `/var/run/docker.sock` so it can drive the server's own Docker daemon, and joins that socket's group via `group_add: ["${DOCKER_GID}"]` because the image runs non-root. Postgres declares a compose healthcheck and the backend gates on it with `depends_on … condition: service_healthy`; the two application images declare their own `HEALTHCHECK`. Only `backend` (`BACKEND_PORT`) and `frontend` (`FRONTEND_PORT`) publish host ports.

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

### Environment contract

| Group             | Variables                                                                                     |
|-------------------|-----------------------------------------------------------------------------------------------|
| Build / ports     | `NODE_VERSION`, `PNPM_VERSION`, `IMAGE_TAG`, `BACKEND_PORT`, `FRONTEND_PORT`                   |
| Backend runtime   | `NODE_ENV`, `PORT`, `CORS_ORIGIN`, `THROTTLE_TTL`, `THROTTLE_LIMIT`, `THROTTLE_STREAM_TTL`, `THROTTLE_STREAM_LIMIT` |
| Deployment logs   | `LOGS_RETENTION_HOURS` (age window, example value `24`), `LOGS_MAX_LINES` (per-deployment line cap, example value `5000`) |
| PostgreSQL        | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` |
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

The installer (`scripts/install.sh`) is a dependency-free POSIX `/bin/sh` script. It fails fast (`set -e`), escalates with `sudo` when not run as root, and is safe to re-run: an existing `.env` is preserved, already-applied migrations are skipped, and the admin seed is idempotent. It requires `curl`, `openssl` (for secret generation), and `tar` on the host.

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

The script runs seven ordered steps:

1. **Ensure Docker.** If Docker or the compose plugin is missing, it installs both via the official `get.docker.com` convenience script and enables the daemon.
2. **Resolve version and fetch source.** It resolves the ref (see above) and downloads the repo tarball from `codeload.github.com` into the install directory. An existing install (a directory that already holds `iac/production/docker-compose.yml`) is reused rather than re-fetched.
3. **Write `.env`.** It copies `iac/production/.env.example` to `.env` and fills in secure random secrets — a shared `POSTGRES_PASSWORD`/`DB_PASSWORD`, and `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` (32-byte hex) — sets `NODE_ENV=production`, and points `CORS_ORIGIN` at the host's own address on port `8080`. It also detects the host's docker group id (`getent group docker`, falling back to the socket's owning group) and writes it as `DOCKER_GID`, which compose feeds to the backend's `group_add` so the non-root container can use the socket; the installer aborts with a clear message if that GID cannot be resolved. GitHub App credentials are left as placeholders.
4. **Start the database only.** It runs `docker compose … up -d postgres` — deliberately *not* a full `up -d` — and polls the `gitpaas-postgres` container's health until it reports `healthy` (up to ~5 minutes). The backend and frontend stay down at this point.
5. **Apply the SQL migrations.** See [Schema bootstrap](#schema-bootstrap).
6. **Bootstrap the first admin.** See [Interactive admin seeding](#interactive-admin-seeding).
7. **Bring up the application stack.** Only once the schema is current and the admin row exists it runs `docker compose … up -d --build`, which starts the backend, then the frontend, and polls the `gitpaas-backend` container's health until it reports `healthy` (up to ~5 minutes).

On success it prints a summary with the frontend/API URLs, the admin credentials, and the remaining manual follow-ups.

#### Interactive admin seeding

Once the schema is in place — and **before any application container has ever started** — the installer provisions the **first** administrator directly in the database. If no email was passed via `--email`/`GITPAAS_ADMIN_EMAIL`, it prompts for one on the controlling terminal (`/dev/tty`, because stdin is the piped script itself). It then:

1. **Hashes a generated random alphanumeric password** in a throwaway `alpine` container running the `argon2` CLI, with the parameters that mirror node-argon2's defaults, so the backend's argon2id verifier accepts the encoded string as-is:

   ```sh
   docker run --rm -e GITPAAS_PW=… -e GITPAAS_SALT=… alpine:3.22 \
     sh -c 'apk add --no-cache argon2 >/dev/null 2>&1 || exit 1; printf %s "$GITPAAS_PW" | argon2 "$GITPAAS_SALT" -id -t 3 -m 16 -p 4 -l 32 -e'
   ```

   The password and a random 16-byte hex salt travel as environment variables (never as arguments, so they stay out of `ps`), and the installer aborts unless the result starts with `$argon2id$v=19$m=65536,t=3,p=4$`.
2. **Inserts the row** with `INSERT INTO "users" … VALUES (:'email', :'hash', 'admin', true) ON CONFLICT ("email") DO NOTHING`. Email and hash are passed as psql variables (`-v`), so psql — not the shell — quotes them and no value can break out of the statement. `ON CONFLICT` keeps the install re-runnable: an existing admin is left untouched and its password is **not** rotated.

Because the whole bootstrap only talks to Postgres, the backend image is not needed and the application never boots against an admin-less database. The generated password is printed once in the final summary — it is never stored in readable form, so the operator must copy it immediately.

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
  captured output ─► batched into PostgreSQL `logs` (≤100 lines / ≤250 ms)
                  └─► in-process fan-out ─► SSE to browser
```

Infrastructure properties that matter:

- **Durable queue** — tasks are persisted (at-least-once, bounded retries, dead-lettering, restart recovery), so in-flight deployments survive a control-plane restart. Runs serialize per compose-project name while distinct projects run concurrently.
- **Local execution over the Docker socket** — the backend talks to the daemon on `/var/run/docker.sock`, so access is governed by the socket mount and its file permissions rather than by network credentials (and, as noted in [Conventions](#conventions), that access is root-equivalent on the host). The same path is used in development and production.
- **One store for live and historical logs** — captured lines go to a single PostgreSQL table, batched at 100 lines or 250 ms (whichever comes first) and fanned out in-process to SSE subscribers at the same time. A subscriber is served the stored rows first, then the live feed, deduplicated by sequence number, so history is fully replayable after the run ends and a crash loses at most one unflushed batch.
- **Bounded log growth** — retention is capped two ways: `LOGS_MAX_LINES` per deployment (enforced after every flush) and `LOGS_RETENTION_HOURS` across all deployments. The age sweep is *opportunistic*: it runs when a deployment completes, since the backend ships no scheduler, so an idle control plane never prunes by age.

The same daemon backs the read-only operational features (container and network inspection, pruning, orphan cleanup) and the readiness probe, which checks PostgreSQL and the Docker daemon in parallel.

### Schema bootstrap

The production schema is owned by **plain SQL files**, not by the application. `iac/production/migrations/*.sql` holds the whole schema, split into numbered files whose lexicographic order is execution order (`001_extensions.sql`, `002_users.sql`, `003_refresh_tokens.sql`, `004_projects_services.sql`, `005_deployments.sql`, `006_logs.sql`, `007_logs_indexes.sql`). Every file is idempotent (`CREATE … IF NOT EXISTS`, foreign keys added inside a `pg_constraint` guard), so applying one twice is a no-op.

`scripts/install.sh` applies them in step 5, right after Postgres reports healthy and before the admin seed and the application containers:

1. It ensures the ledger table `schema_migrations ("filename" text PRIMARY KEY, "applied_at" timestamptz NOT NULL DEFAULT now())` exists.
2. It walks the directory in sorted order, skipping every filename already in the ledger.
3. Each pending file is piped into `docker compose exec -T postgres psql -v ON_ERROR_STOP=1 …` wrapped in a single transaction together with its `INSERT INTO schema_migrations` row, so a failed migration can never be recorded as applied; the installer then aborts naming the offending file.

The backend therefore ships **no migration machinery at all** — no TypeORM migrations, no CLI DataSource, no `migration:*` scripts, and the compose stack has no `migrate` service. In development and test, TypeORM `synchronize` still builds the schema from the entities. The consequence: because `migration:generate` no longer exists, **every entity change must be mirrored by a hand-written `.sql` file** in `iac/production/migrations/` (same types, defaults and constraint names TypeORM expects) — see that directory's `README.md`.

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
| Prod admin seeding  | The installer inserts the first admin straight into Postgres (argon2id hash from a throwaway container) before the backend ever starts; idempotent — see [Interactive admin seeding](#interactive-admin-seeding) |

### Not covered yet

- **Reverse proxy, automatic TLS, and domain routing** for deployed apps — Phase 2.

## Related docs

- [Deployment roadmap](./deployment-roadmap.md)
- [Backend architecture](./backend-architecture.md)
- [Frontend architecture](./frontend-architecture.md)
- [Monorepo architecture](./monorepo-architecture.md)
