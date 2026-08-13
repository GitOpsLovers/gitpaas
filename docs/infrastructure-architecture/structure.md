# Structure

## Development

`iac/development/docker-compose.yml` (project `gitpaas-dev`) starts the dependencies of the control plane. The backend and the frontend run **on the host** with `pnpm dev` and point to these services on `127.0.0.1`. Each published port is available only on the loopback interface.

| Service        | Role                                            | Host port |
|----------------|-------------------------------------------------|-----------|
| `postgres`     | Control-plane database                          | 5432      |
| `redis`        | Hot store of the live deployment logs           | 6379      |
| `pgadmin`      | Optional Postgres web UI, server pre-registered | 5050      |

The workloads are **not** simulated. The backend on the host opens `/var/run/docker.sock` directly. Thus all the applications that GitPaaS deploys locally run on the Docker daemon of the developer. This is the same code path as in production, and it needs no certificates and no additional container. The daemon must run, or the Docker endpoints and the readiness probe cannot operate.

```text
host: backend (pnpm dev)  ──unix socket──►  /var/run/docker.sock
        │                                      └─ deployed compose stacks
        ├─ 127.0.0.1:5432 ► postgres
        └─ 127.0.0.1:6379 ► redis
```

### Admin seeding

The development Postgres container starts **empty**. When the backend application starts, TypeORM `synchronize` makes the full schema and starts the seeding with the credentials `admin@gitpaas.dev` / `gitpaas`.

## Production

`iac/production/docker-compose.yml` (project `gitpaas`) starts `postgres`, `redis`, `backend` and `frontend`, with two named volumes (`postgres-data` and `redis-data`). The `backend` service bind-mounts the `/var/run/docker.sock` socket of the host. Thus it can control the Docker daemon of the server. The image runs as a non-root user. Thus the service becomes a member of the group of that socket with `group_add: ["${DOCKER_GID}"]`. Postgres and Redis declare a compose healthcheck, and the backend waits for the two with `depends_on … condition: service_healthy`. The two application images declare their own `HEALTHCHECK`. Only `backend` (`BACKEND_PORT`) and `frontend` (`FRONTEND_PORT`) publish host ports.

The stack has **no reverse proxy and no TLS termination on purpose**. A proxy in front of the deployed applications, with automatic TLS, is Phase 2 of the roadmap.

The two images are built from multi-stage Dockerfiles whose **build context is the repository root**. Thus the workspace lockfile and the manifests are available for an installation with pnpm in Turborepo. The Node version and the pnpm version are build arguments with the values of `.tool-versions`. The two final images run as a non-root user.

| Image                        | Stages                                                                                                  |
|------------------------------|----------------------------------------------------------------------------------------------------------|
| `backend.Dockerfile`         | `base` (Node + pnpm) → `build` (install with dev deps, compile, then `pnpm deploy` a prod-only bundle with de-symlinked `node_modules`) → `runtime` (slim, `dist/` + prod deps, `node` user). Healthcheck hits the public `GET /api/v1` via global `fetch`. |
| `frontend.Dockerfile`        | `base` → `build` (static Angular bundle) → `runtime` (nginx-unprivileged on `8080`). `nginx.conf` adds `/healthz`, an SPA history fallback to `index.html`, one-year immutable caching for content-hashed assets, and gzip. |

`.dockerignore` decreases the root context to the workspace manifests, the source trees of the two applications, and `nginx.conf`. It always removes `node_modules`, the build output and the secrets, which the build stages make again.

### Live log store

The two environments give the same `redis` service to the backend, with the image `redis:8.2-alpine`. It is the hot store of the deployment logs: the output of a run stays in a Redis stream while the run lasts, and PostgreSQL keeps the archive (see [backend architecture](../backend-architecture/key-flows.md#deployment-log-store)).

The service starts with `redis-server --appendonly yes --appendfsync everysec`. Thus the append-only file goes to the disk one time each second, and a crash costs approximately one second of the output of a run at a maximum. The file stays in the named volume `redis-data`, which is mounted at `/data`, so a restart of the container keeps the streams that are open. The healthcheck is a `redis-cli ping` with the same intervals as the database.

The two environments are different only in the publication of the port:

- **Development** publishes `127.0.0.1:6379`, because the backend runs on the host and connects through the loopback interface.
- **Production** publishes **no** host port. The backend is in the same compose network and reaches the server by its service name, so Redis is not available from outside the stack.

The backend gets its connection from the environment: `REDIS_HOST`, `REDIS_PORT` and the optional `REDIS_PASSWORD`. The first two are necessary, and the application stops at boot if one of them is not there. Leave the password empty when the server needs no authentication.
