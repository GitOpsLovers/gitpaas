# Structure

`iac/` holds all the code that defines and sets up the infrastructure of the project. It splits into `iac/development/` and `iac/production/`.

## Development (`iac/development/`)

| File                             | Purpose                                                           |
|-----------------------------------|------------------------------------------------------------------|
| `docker-compose.yml`             | Compose stack (project `gitpaas-dev`) for the local dependencies. |
| `pgadmin/servers.json`           | Pre-registers the local Postgres server in pgAdmin.               |
| `redisinsight/databases.json`    | Pre-registers the local Redis database in RedisInsight.           |

The stack defines four services:

| Service        | Role                                            |
|----------------|-------------------------------------------------|
| `postgres`     | Control-plane database.                         |
| `redis`        | Hot store of the live deployment logs.          |
| `pgadmin`      | Web UI to inspect and query the local Postgres. |
| `redisinsight` | Web UI to inspect and query the local Redis.    |

Named volumes: `postgres-data`, `redis-data`, `pgadmin-data` and `redisinsight-data` — one for each service's persisted data.

Only the dependencies run in this compose stack. The backend and the frontend run **on the host**, with `pnpm dev`, and reach these services on `127.0.0.1`. For what runs where at deploy time and how the backend reaches the Docker daemon, see [Key flows](./key-flows.md#deployment) and [Conventions](./conventions.md).

## Production (`iac/production/`)

| File                    | Purpose                                            |
|-------------------------|----------------------------------------------------|
| `docker-compose.yml`    | Compose stack for the full control plane.          |
| `backend.Dockerfile`    | Builds the backend image.                          |
| `frontend.Dockerfile`   | Builds the frontend image, served by nginx.        |
| `nginx.conf`            | nginx configuration that the frontend image ships. |
| `migrations/`           | SQL schema files.                                  |
| `.env.example`          | Template for the operator's `.env`.                |

The stack defines four services:

| Service    | Role                                   |
|------------|----------------------------------------|
| `postgres` | Control-plane database.                |
| `redis`    | Hot store of the live deployment logs. |
| `backend`  | NestJS control-plane API.              |
| `frontend` | nginx serving the built Angular SPA.   |

The stack defines five services:

| Service    | Role                                                                                                                 |
|------------|----------------------------------------------------------------------------------------------------------------------|
| `proxy`    | Reverse proxy Traefik: the two entrypoints of the server, and the routing of the control plane and of the workloads. |
| `postgres` | Control-plane database.                                                                                              |
| `redis`    | Hot store of the live deployment logs.                                                                               |
| `backend`  | NestJS control-plane API.                                                                                            |
| `frontend` | nginx serving the built Angular SPA.                                                                                 |

Named volumes: `postgres-data`, holding the Postgres data directory, `redis-data`, holding the Redis append-only file, and `proxy-acme`, holding the store of ACME of the proxy — its certificates and its account of Let's Encrypt.

`proxy` holds the ports `80` and `443` of the server, the only ports that a domain reaches. It watches the socket of Docker to find the labels of the routing, and it is the one service on the network `gitpaas-proxy`, besides `frontend` and a workload that a domain names. See [Key flows](./key-flows.md#the-reverse-proxy) for the routing, and the capability [domains](../../business/domains.md) for its rules.

The `backend` and the `frontend` services **pull published images**:

```text
ghcr.io/gitopslovers/gitpaas-backend:${IMAGE_TAG:-latest}
ghcr.io/gitopslovers/gitpaas-frontend:${IMAGE_TAG:-latest}
```

## Development vs. production

In development, only the dependencies (`postgres`, `redis`, `pgadmin`, `redisinsight`) run in compose, and no proxy runs: the backend and the frontend reach each other and the developer directly, on the host. In production, every part of the stack — `proxy`, `postgres`, `redis`, `backend` and `frontend` — runs in compose, from the published images above.
