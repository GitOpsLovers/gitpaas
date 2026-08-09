# Infrastructure architecture

This document gives the infrastructure on which the GitPaaS application runs.

## Overview

GitPaaS runs **fully on one server**. Two responsibilities stay together on that server:

- **Control plane**: GitPaaS itself, that is, the backend application and the frontend application, plus a PostgreSQL database that holds all the durable data. This data includes the deployment logs, which are the buffer of the live stream and the history at the same time.
- **Workloads**: the applications that the user deploys, which run as compose stacks on the Docker daemon of the same server.

The backend controls the **local** Docker daemon through the `/var/run/docker.sock` unix socket. In production, this socket is bind-mounted into the backend container. In development, the backend uses the socket of the developer. There is no remote daemon, no TCP endpoint and no mTLS material in the topology.

---

## Stack

| Concern             | Tool                                                   |
|---------------------|--------------------------------------------------------|
| Orchestration       | Docker Compose (`iac/development/`, `iac/production/`) |
| Images              | Multi-stage Dockerfiles                                |
| Database            | `postgres:17.6-alpine`                                 |
| Workload execution  | Local Docker daemon via `/var/run/docker.sock`         |
| Static serving      | nginx-unprivileged                                     |
| Release             | GitHub Actions + semantic-release, images on GHCR      |

---

## Structure

### Development

`iac/development/docker-compose.yml` (project `gitpaas-dev`) starts the dependencies of the control plane. The backend and the frontend run **on the host** with `pnpm dev` and point to these services on `127.0.0.1`. Each published port is available only on the loopback interface.

| Service        | Role                                            | Host port |
|----------------|-------------------------------------------------|-----------|
| `postgres`     | Control-plane database                          | 5432      |
| `pgadmin`      | Optional Postgres web UI, server pre-registered | 5050      |

The workloads are **not** simulated. The backend on the host opens `/var/run/docker.sock` directly. Thus all the applications that GitPaaS deploys locally run on the Docker daemon of the developer. This is the same code path as in production, and it needs no certificates and no additional container. The daemon must run, or the Docker endpoints and the readiness probe cannot operate.

```text
host: backend (pnpm dev)  ──unix socket──►  /var/run/docker.sock
        │                                      └─ deployed compose stacks
        └─ 127.0.0.1:5432 ► postgres
```

#### Admin seeding

The development Postgres container starts **empty**. When the backend application starts, TypeORM `synchronize` makes the full schema and starts the seeding with the credentials `admin@gitpaas.dev` / `gitpaas`.

### Production

`iac/production/docker-compose.yml` (project `gitpaas`) starts `postgres`, `backend` and `frontend`, with one named volume (`postgres-data`). The `backend` service bind-mounts the `/var/run/docker.sock` socket of the host. Thus it can control the Docker daemon of the server. The image runs as a non-root user. Thus the service becomes a member of the group of that socket with `group_add: ["${DOCKER_GID}"]`. Postgres declares a compose healthcheck, and the backend waits for it with `depends_on … condition: service_healthy`. The two application images declare their own `HEALTHCHECK`. Only `backend` (`BACKEND_PORT`) and `frontend` (`FRONTEND_PORT`) publish host ports.

The stack has **no reverse proxy and no TLS termination on purpose**. A proxy in front of the deployed applications, with automatic TLS, is Phase 2 of the roadmap.

The two images are built from multi-stage Dockerfiles whose **build context is the repository root**. Thus the workspace lockfile and the manifests are available for an installation with pnpm in Turborepo. The Node version and the pnpm version are build arguments with the values of `.tool-versions`. The two final images run as a non-root user.

| Image                        | Stages                                                                                                  |
|------------------------------|----------------------------------------------------------------------------------------------------------|
| `backend.Dockerfile`         | `base` (Node + pnpm) → `build` (install with dev deps, compile, then `pnpm deploy` a prod-only bundle with de-symlinked `node_modules`) → `runtime` (slim, `dist/` + prod deps, `node` user). Healthcheck hits the public `GET /api/v1` via global `fetch`. |
| `frontend.Dockerfile`        | `base` → `build` (static Angular bundle) → `runtime` (nginx-unprivileged on `8080`). `nginx.conf` adds `/healthz`, an SPA history fallback to `index.html`, one-year immutable caching for content-hashed assets, and gzip. |

`.dockerignore` decreases the root context to the workspace manifests, the source trees of the two applications, and `nginx.conf`. It always removes `node_modules`, the build output and the secrets, which the build stages make again.

---

## Conventions

- **The environment gives the configuration.** `iac/production/.env.example` gives the full contract. The operator copies it to `.env`. Compose loads `.env` automatically for the `${…}` interpolation and, with `env_file`, as the runtime configuration of the backend. The backend validates each variable at boot and stops immediately if a variable is not correct. There are no silent default values. Do not commit a real `.env` file.
- **The secrets stay out of the images.** Each credential comes at runtime through `.env`. No sensitive data is put in a layer.
- **The access to Docker is a mount plus a group.** The daemon is available through the bind-mounted `/var/run/docker.sock` socket. The backend image runs as the non-root `node` user. Thus the service declares `group_add: ["${DOCKER_GID}"]` with the docker group id of the host, which the installer finds and writes to `.env`. Then the container can use the socket. **The mount of the socket gives the backend the equivalent of root access on the host.** Any process that can speak to the daemon can start a privileged container and get control of the machine. Thus an attack on the backend, or on an account that can deploy through the backend, is equal to an attack on the server. A container that runs as a non-root user does not change this. This is the accepted trade-off of the single-server model. To decrease the risk, use the host only for GitPaaS and give the GitPaaS users the trust level of an operator of that host.
- **The version pins stay in one place** (`.tool-versions`) and go into the compose build arguments and into CI.

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

Only compose uses `DOCKER_GID`. This variable is necessary, and the stack does not start without it. The backend validates each other variable, but not the `POSTGRES_*` pair.

---

## Installation

### One-line installer

One command changes a new server into a GitPaaS control plane that operates:

```sh
curl -fsSL https://raw.githubusercontent.com/GitOpsLovers/gitpaas/main/scripts/install.sh | sh
```

The installer (`scripts/install.sh`) is a POSIX `/bin/sh` script with no dependencies. It stops at the first error (`set -e`), it uses `sudo` if the user is not root, and you can run it again safely: it keeps an available `.env`, it does not apply a migration two times, and the admin seeding is idempotent. The host must have `curl`, `openssl` (for the generation of the secrets) and `tar`.

#### Version selection

By default, the installer installs `latest`. It finds this version from the **latest release** tag on GitHub. If there is no release, it uses the newest tag. If there is no tag or the API has a rate limit, it uses `main`. To select a specified ref, use a flag or an environment variable:

```sh
# Flag form
curl -fsSL …/install.sh | sh -s -- --version v1.0.0

# Environment form
GITPAAS_VERSION=v1.0.0 sh -c "$(curl -fsSL …/install.sh)"
```

The source comes from the `codeload` tarball endpoint of GitHub. Thus `--version` accepts a tag name **or** a branch name.

#### Options

Each option is a flag and has an equivalent environment variable:

| Flag | Environment variable | Default | Purpose |
|---|---|---|---|
| `--version <ref>` | `GITPAAS_VERSION` | `latest` | Tag or branch to install. |
| `--dir <path>` | `GITPAAS_DIR` | `/opt/gitpaas` | Install directory the source is unpacked into. |
| `--email <email>` | `GITPAAS_ADMIN_EMAIL` | *(prompted)* | First admin's email; skips the interactive prompt. |

#### What the installer does

The script does seven steps in sequence:

1. **Make sure that Docker is available.** If Docker or the compose plugin is missing, the script installs the two parts with the official `get.docker.com` convenience script and enables the daemon.
2. **Find the version and get the source.** The script finds the ref (see above) and downloads the tarball of the repository from `codeload.github.com` into the install directory. If there is an installation already (a directory that has `iac/production/docker-compose.yml`), the script uses it and does not download the source again.
3. **Write `.env`.** The script copies `iac/production/.env.example` to `.env` and puts secure random secrets in it: one value for `POSTGRES_PASSWORD` and `DB_PASSWORD`, and 32-byte hex values for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`. It sets `NODE_ENV=production` and points `CORS_ORIGIN` to the address of the host on port `8080`. It also finds the docker group id of the host (with `getent group docker`, or from the owning group of the socket) and writes it as `DOCKER_GID`. Compose gives this value to the `group_add` of the backend, and then the non-root container can use the socket. If the script cannot find that GID, it stops with a clear message. The GitHub App credentials stay as placeholders.
4. **Start only the database.** The script runs `docker compose … up -d postgres` and not a full `up -d`. Then it examines the health of the `gitpaas-postgres` container until the container is `healthy` (for a maximum of approximately 5 minutes). At this step, the backend and the frontend do not run.
5. **Apply the SQL migrations.** See [Schema bootstrap](#schema-bootstrap).
6. **Make the first admin.** See [Interactive admin seeding](#interactive-admin-seeding).
7. **Start the application stack.** Only when the schema is current and the admin row is available, the script runs `docker compose … up -d --build`. This starts the backend and then the frontend, and the script examines the health of the `gitpaas-backend` container until the container is `healthy` (for a maximum of approximately 5 minutes).

At the end, the script shows a summary with the frontend URL and the API URL, the admin credentials, and the manual steps that stay.

#### Interactive admin seeding

When the schema is available — and **before the first start of an application container** — the installer makes the **first** administrator directly in the database. If `--email` or `GITPAAS_ADMIN_EMAIL` did not give an email, the script asks for an email on the controlling terminal (`/dev/tty`, because stdin is the piped script). Then it does these steps:

1. **It makes a hash of a random alphanumeric password** in a temporary `alpine` container that runs the `argon2` CLI. The parameters are the same as the defaults of node-argon2. Thus the argon2id verifier of the backend accepts the encoded string without a change:

   ```sh
   docker run --rm -e GITPAAS_PW=… -e GITPAAS_SALT=… alpine:3.22 \
     sh -c 'apk add --no-cache argon2 >/dev/null 2>&1 || exit 1; printf %s "$GITPAAS_PW" | argon2 "$GITPAAS_SALT" -id -t 3 -m 16 -p 4 -l 32 -e'
   ```

   The password and a random 16-byte hex salt go as environment variables and never as arguments. Thus they do not show in `ps`. The installer stops if the result does not start with `$argon2id$v=19$m=65536,t=3,p=4$`.
2. **It adds the row** with `INSERT INTO "users" … VALUES (:'email', :'hash', 'admin', true) ON CONFLICT ("email") DO NOTHING`. The email and the hash go as psql variables (`-v`). Thus psql, and not the shell, puts the quotes, and no value can get out of the statement. `ON CONFLICT` lets you run the installation again: an admin that is already there does not change, and the script does not change its password.

The full bootstrap speaks only to Postgres. Thus the backend image is not necessary, and the application never starts against a database without an admin. The generated password is shown one time in the final summary. It is never stored in a readable form, and the operator must copy it immediately.

#### Manual follow-ups

The installer starts a control plane that operates, but the source integration still needs input from the operator. The summary tells the operator to do this in `iac/production/.env`:

- Put in the GitHub App credentials: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` (a base64-encoded PEM) and `GITHUB_APP_INSTALLATION_ID`.

After the change of `.env`, apply the change with `docker compose -f <dir>/iac/production/docker-compose.yml up -d`.

> **Known limitation.** The production frontend image contains `apiBaseUrl: http://localhost:3000/api/v1` from the build. Thus, if you open the UI from a machine that is **not** the server, the UI currently calls the incorrect API host. A future build argument for the frontend will make the API base configurable at the installation.

---

## Key flows

### Deployment

A deployment is "start the compose stack of a service on the Docker daemon of the server". The control plane controls all the steps (for the application-level data, see [backend architecture](./backend-architecture.md)):

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

These infrastructure properties are important:

- **Durable queue** — the tasks are stored (at-least-once, with a limited number of new attempts, a dead-letter state and a recovery at restart). Thus the deployments in progress stay after a restart of the control plane. The runs of one compose-project name occur one after the other, but different projects run at the same time.
- **Local execution over the Docker socket** — the backend speaks to the daemon on `/var/run/docker.sock`. Thus the socket mount and its file permissions control the access, and not network credentials. As [Conventions](#conventions) says, this access is equal to root access on the host. Development and production use the same path.
- **One store for the live logs and the historical logs** — the captured lines go to one PostgreSQL table, in batches of 100 lines or 250 ms (whichever occurs first), and go to the SSE subscribers in the process at the same time. A subscriber first gets the stored rows and then the live feed, with a deduplication by sequence number. Thus the full history is available for a replay after the end of the run, and a crash loses one batch that is not yet written as a maximum.
- **Limited log growth** — two settings limit the retention: `LOGS_MAX_LINES` for each deployment (applied after each write of a batch) and `LOGS_RETENTION_HOURS` for all the deployments. The age sweep is *opportunistic*: it runs when a deployment completes, because the backend has no scheduler. Thus an idle control plane never removes rows by age.

The same daemon supports the read-only operational features (the view of the containers and the networks, the removal of unused resources, and the orphan cleanup) and the readiness probe, which examines PostgreSQL and the Docker daemon at the same time.

### Schema bootstrap

**Plain SQL files** own the production schema, and not the application. `iac/production/migrations/*.sql` holds the full schema in numbered files. The lexicographic order of the names is the order of execution (`001_extensions.sql`, `002_users.sql`, `003_refresh_tokens.sql`, `004_projects_services.sql`, `005_deployments.sql`, `006_logs.sql`, `007_logs_indexes.sql`). Each file is idempotent (`CREATE … IF NOT EXISTS`, and the foreign keys are added in a `pg_constraint` guard). Thus, if you apply a file two times, the second time has no effect.

`scripts/install.sh` applies the files in step 5, immediately after Postgres is healthy and before the admin seeding and the application containers:

1. It makes sure that the ledger table `schema_migrations ("filename" text PRIMARY KEY, "applied_at" timestamptz NOT NULL DEFAULT now())` is available.
2. It reads the directory in sorted order and does not use the files that are already in the ledger.
3. It sends each remaining file to `docker compose exec -T postgres psql -v ON_ERROR_STOP=1 …` in one transaction together with its `INSERT INTO schema_migrations` row. Thus a migration that fails cannot be recorded as applied, and the installer stops and gives the name of the file with the error.

Thus the backend has **no migration machinery**: no TypeORM migrations, no CLI DataSource, no `migration:*` scripts, and no `migrate` service in the compose stack. In development and in test, TypeORM `synchronize` continues to make the schema from the entities. As a result, and because `migration:generate` is no longer available, **you must write the same change manually in a `.sql` file** in `iac/production/migrations/`, with the types, the defaults and the constraint names that TypeORM needs. See the `README.md` in that directory.

### Release and image publishing

`.github/workflows/release.yml` starts manually (`workflow_dispatch`) and runs two jobs in sequence:

1. **release** — semantic-release (v24, with the configuration in `.releaserc.json`, branch `main`) reads the Conventional Commits after the last tag, calculates the next version, and makes the git tag and the GitHub Release. It gives the data if a release occurred and which version it made.
2. **publish** — this job runs only if the first job made a release. With Buildx and QEMU it builds the backend image and the frontend image for more than one architecture (`linux/amd64,linux/arm64`) and pushes them to GHCR. The tags are the exact version and `latest`, with provenance attestations and SBOM attestations.

The token scopes are the minimum necessary (`contents`, `packages`, plus issues and PRs for the release comments). The images are public:

```text
ghcr.io/gitopslovers/gitpaas-backend:{version|latest}
ghcr.io/gitopslovers/gitpaas-frontend:{version|latest}
```

The commits control all the versioning: `fix:` gives a patch, `feat:` gives a minor version, and a breaking change gives a major version.

---

## Operations

| Task                | How                                                                                          |
|---------------------|-----------------------------------------------------------------------------------------------|
| Start dev stack     | `docker compose up -d` from `iac/development/`, then `pnpm dev` at the repo root               |
| Dev credentials     | The backend makes `admin@gitpaas.dev` / `gitpaas` at boot (`NODE_ENV=development`) with the shared `seedAdminUseCase`. The operation is idempotent, so to make the admin again, delete the admin row and restart. It is not necessary to make the volume again. See [Development admin seeding](#development-admin-seeding) |
| Dev schema          | Created by TypeORM `synchronize` on backend boot (dev only)                                    |
| Start prod stack    | `cp .env.example .env`, fill it in, then `docker compose -f iac/production/docker-compose.yml up -d --build` |
| Install on a server    | `curl -fsSL …/scripts/install.sh | sh` — see [Installation](#installation) |
| Prod admin seeding  | The installer puts the first admin directly into Postgres (with an argon2id hash from a temporary container) before the first start of the backend. The operation is idempotent — see [Interactive admin seeding](#interactive-admin-seeding) |

### Not covered yet

- **Reverse proxy, automatic TLS, and domain routing** for the deployed applications — Phase 2.

---

## Related docs

- [Deployment roadmap](./deployment-roadmap.md)
- [Backend architecture](./backend-architecture.md)
- [Frontend architecture](./frontend-architecture.md)
- [Monorepo architecture](./monorepo-architecture.md)
