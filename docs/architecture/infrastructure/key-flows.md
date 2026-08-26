# Key flows

## Deployment

A deployment is "start the compose stack of a service on the Docker daemon of the server". The control plane controls all the steps (for the application-level data, see [backend architecture](../backend.md)):

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
  captured output ─► XADD ─► redis stream `logs:{deploymentId}` ─► SSE to browser
                                      │
                            run ends ─┴─► one bulk insert into PostgreSQL `logs`
```

These infrastructure properties are important:

- **Durable queue** — the tasks are stored (at-least-once, with a limited number of new attempts, a dead-letter state and a recovery at restart). Thus the deployments in progress stay after a restart of the control plane. The runs of one compose-project name occur one after the other, but different projects run at the same time.
- **Local execution over the Docker socket** — the backend speaks to the daemon on `/var/run/docker.sock`. Thus the socket mount and its file permissions control the access, and not network credentials. As [Conventions](./conventions.md) says, this access is equal to root access on the host.
- **A hot store and a cold archive for the logs** — the captured lines go to one Redis stream for each deployment, and the SSE subscribers read that same stream from its first entry. When the run ends, the full stream goes to the PostgreSQL `logs` table in one write, and the key in Redis expires 60 seconds later. Thus the full history is available for a replay after the end of the run, but **`GET /logs` gives no history while the run is in progress**. A crash of Redis loses the log of a run that is in progress, and the append-only file with `everysec` limits that loss to approximately one second.
- **Limited log growth** — one setting limits the size of a log: `LOGS_MAX_LINES` for each deployment, which Redis applies on each append with `XADD MAXLEN ~`. The archive has no age limit and no scheduled sweep. The archived rows of a deployment stay until the deployment is deleted, because the foreign key of the `logs` table uses `ON DELETE CASCADE`.

The same daemon supports the read-only operational features (the view of the containers and the networks, the removal of unused resources, and the orphan cleanup) and the readiness probe, which examines PostgreSQL and the Docker daemon at the same time.

## Startup ordering and the log store

Postgres and Redis declare a compose healthcheck, and the backend waits for the two with `depends_on … condition: service_healthy`. The two application images declare their own `HEALTHCHECK`. The healthcheck of Redis is a `redis-cli ping` with the same intervals as the database.

The Redis append-only file stays in the named volume `redis-data`, which is mounted at `/data`, so a restart of the container keeps the streams that are open.

Redis publishes no host port. The backend is in the same compose network and reaches the server by its service name, so Redis is not available from outside the stack.

## The reverse proxy

The service `proxy` (Traefik) holds the ports `80` and `443` of the server, and no other service publishes a port that a domain reaches. It watches the labels of the socket of Docker (`--providers.docker`), on the network `gitpaas-proxy` alone (`--providers.docker.network`), and it builds its routing from those labels — it needs no static configuration file for a domain.

```text
apps/backend ──buildRouting()──► labels ──stampRouting()──► compose recipe of the run
                                                                    │
                                                        DockerExecutor.up() ─► containers
                                                                    │
                                                docker.getNetwork('gitpaas-proxy').connect()
                                                                    │
                                                              proxy watches the socket ─► routes the host
```

- **The labels travel with the deployment, and not with a separate call.** `run-deployment.use-case.ts` reads the domains of the service and asks `ReverseProxy.buildRouting()` for the labels, grouped by the compose service that each domain names. `DockerExecutor` stamps them on the recipe beside the labels of the platform (`stampLabels`), so one run of a deployment carries the whole routing of the service.
- **A routed container joins the network of the proxy after `compose.up`, and not in the recipe.** `dockerode-compose` crashes on a network that the recipe declares `external`, so the executor calls `docker.getNetwork('gitpaas-proxy').connect()` for each routed container once the stack is already up. A container that fails to join is a best-effort cleanup: it is already unrouted, because the proxy only watches the labels of a container that reached the network.
- **The certificate of Let's Encrypt is the responsibility of the proxy alone.** The resolver `letsencrypt` gets a certificate for a domain the first time a router of that domain asks for TLS, with the challenge HTTP-01 on the entrypoint `web`. The store of ACME lives in the named volume `proxy-acme`, at `/acme/acme.json` inside the container. `TraefikReverseProxyAdapter` reads that same file to report the state of a certificate (`ready` once the host appears there, `pending` before), and it asks the proxy for nothing else — the backend never talks to the API of Traefik.
- **The control plane routes through the same proxy as a workload.** `CONTROL_PLANE_PROXY` and `CONTROL_PLANE_DOMAIN` hold the labels of `frontend` in `iac/production/docker-compose.yml`: false and empty until the operator gives a domain, so the control plane keeps answering on its published port meanwhile. Once a domain is set, one router carries HTTPS and one plain router only redirects to it — the same shape that `TraefikReverseProxyAdapter` builds for a workload.

See the capability [domains](../../business/domains.md) for the rules that a domain follows, and [Structure](./structure.md) for the service `proxy` in the stack.

## Schema bootstrap

**Plain SQL files** own the production schema, and not the application. `iac/production/migrations/*.sql` holds the full schema in numbered files. Each name starts with a three-digit number, and the **lexicographic order of the names is the order of execution**. A new change gets the next number, and an applied file never changes. Each file is idempotent (`CREATE … IF NOT EXISTS`, and the foreign keys are added in a `pg_constraint` guard). Thus, if you apply a file two times, the second time has no effect.

`scripts/install.sh` applies the files in step 5, immediately after Postgres is healthy and before the admin seeding and the application containers:

1. It makes sure that the ledger table `schema_migrations ("filename" text PRIMARY KEY, "applied_at" timestamptz NOT NULL DEFAULT now())` is available.
2. It reads the directory in sorted order and does not use the files that are already in the ledger.
3. It sends each remaining file to `docker compose exec -T postgres psql -v ON_ERROR_STOP=1 …` in one transaction together with its `INSERT INTO schema_migrations` row. Thus a migration that fails cannot be recorded as applied, and the installer stops and gives the name of the file with the error.

Thus the backend has **no migration machinery**: no TypeORM migrations, no CLI DataSource, no `migration:*` scripts, and no `migrate` service in the compose stack. In development and in test, TypeORM `synchronize` continues to make the schema from the entities. As a result, and because `migration:generate` is no longer available, **you must write the same change manually in a `.sql` file** in `iac/production/migrations/`, with the types, the defaults and the constraint names that TypeORM needs.

## Release and image publishing

`.github/workflows/release.yml` starts manually (`workflow_dispatch`) and has two stages:

1. **release** — semantic-release (v25, with the configuration in `.releaserc.json`, branch `main`) reads the Conventional Commits after the last tag, calculates the next version, and makes the git tag and the GitHub Release. It gives the data if a release occurred and which version it made.
2. **publish** — this stage runs only if the first stage made a release. It is a **matrix job with two entries**, one for the backend image and one for the frontend image, so the two images build **at the same time** and not one after the other. Each entry checks out the **release tag** (`ref: v${{ needs.release.outputs.new_release_version }}`) and not the branch head. Thus the content of an image always agrees with the version that its tag names. With Buildx and QEMU each entry builds its image for more than one architecture (`linux/amd64,linux/arm64`) and pushes it to GHCR. The tags are the exact version and `latest`, with provenance attestations and SBOM attestations.

The token scopes are the minimum necessary (`contents`, `packages`, plus issues and PRs for the release comments). The images are public:

```text
ghcr.io/gitopslovers/gitpaas-backend:{version|latest}
ghcr.io/gitopslovers/gitpaas-frontend:{version|latest}
```

The commits control all the versioning: `fix:` gives a patch, `feat:` gives a minor version, and a breaking change gives a major version.

Each Dockerfile builds its image in stages:

| Image                        | Stages                                                                                                  |
|------------------------------|----------------------------------------------------------------------------------------------------------|
| `backend.Dockerfile`         | `base` (Node + pnpm) → `build` (install with dev deps, compile, then `pnpm deploy` a prod-only bundle with de-symlinked `node_modules`) → `runtime` (slim, `dist/` + prod deps, `node` user). Healthcheck hits the public `GET /api/v1` via global `fetch`. |
| `frontend.Dockerfile`        | `base` → `build` (static Angular bundle) → `runtime` (nginx-unprivileged on `8080`). `nginx.conf` adds `/healthz`, an SPA history fallback to `index.html`, one-year immutable caching for content-hashed assets, and gzip. |

`.dockerignore` decreases the root context to the workspace manifests, the source trees of the two applications, and `nginx.conf`. It always removes `node_modules`, the build output and the secrets, which the build stages make again.
