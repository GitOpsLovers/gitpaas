# Contributing

## Prerequisites

- Node `26.1.0` and pnpm (see `.tool-versions`)
- Docker running on your host

## Setup

```bash
pnpm install
```

## Environment configuration

The Backend validates its environment at boot and **fails fast if any variable is missing or malformed** — there are no code-level fallbacks, in every environment including development. Copy the template and fill in every value before running:

```bash
cp apps/backend/.env.example apps/backend/.env
```

The variables cover: runtime (`NODE_ENV`, `PORT`), CORS (`CORS_ORIGIN`), rate limiting (`THROTTLE_TTL`/`THROTTLE_LIMIT` and the SSE-stream pair `THROTTLE_STREAM_TTL`/`THROTTLE_STREAM_LIMIT`), PostgreSQL (`DB_*`), Redis (`REDIS_*`), the GitHub App (`GITHUB_APP_*`), the VPS Docker daemon (`VPS_DOCKER_*`), and JWT auth (`JWT_ACCESS_SECRET`/`JWT_ACCESS_EXPIRES_IN` and `JWT_REFRESH_SECRET`/`JWT_REFRESH_EXPIRES_IN`). The JWT secrets have no defaults — generate strong random values.

## Local development stack

In production the Artifactory deploys applications by talking to a remote VPS's Docker daemon via [Dockerode](https://github.com/apocas/dockerode). Locally we reproduce that VPS with a Docker-in-Docker (DinD) container defined in `iac/development/docker-compose.yml`. Artifactory connects to it over TLS, exactly as it would to a real VPS.

```
Host Docker
└── artifactory-vps                               ← docker:29-dind, the emulated "VPS"
     └── its own dockerd (TLS on 127.0.0.1:2376)
          └── deployed apps                       ← everything the Artifactory deploys lives here
```

Manage it with Docker Compose from `iac/development/`:

```bash
cd iac/development

docker compose up -d --wait                             # start and wait until the daemon is healthy
docker compose down                                     # stop (keeps deployed images/volumes)
docker compose logs -f vps                              # follow logs
docker compose down -v && rm -rf ../../.dev/vps-certs   # wipe all state
```

On first `docker compose up` the container generates TLS certificates and shares the client certs with the host under `.dev/vps-certs/client/`; the Backend reads them from there.

**Ports:** `2376` → TLS Docker daemon (Dockerode target); `8080`→`80` and `8443`→`443` are reserved for a future reverse proxy for deployed apps.

## Running the apps

```bash
docker compose -f iac/development/docker-compose.yml up -d --wait   # start the emulated VPS
pnpm dev                                                            # run all apps, or: pnpm --filter backend dev
```

The Backend builds its Dockerode client from `VPS_DOCKER_HOST`, `VPS_DOCKER_PORT` and `VPS_DOCKER_CERT_PATH` (typical local-development values: `127.0.0.1`, `2376`, and `../../.dev/vps-certs/client`).

All routes are served under the `api/v1` prefix, and every endpoint requires a JWT access token by default. The readiness probe is public and actively checks Postgres, Redis, and the VPS Docker daemon — use it to verify the stack:

```bash
curl http://localhost:3000/api/v1/server/readiness
# { "status": "ok", "dependencies": [ { "name": "postgres", "status": "up" }, ... ] }
```

The authenticated `GET /api/v1/vps/status` endpoint returns richer Docker daemon details (server version, container/image counts), but requires a Bearer token.