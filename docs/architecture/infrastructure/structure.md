# Structure

The `iac` folder is where we store all the code involved in defining and setting up the project's infrastructure. This is divided between the local infrastructure and the production infrastructure.

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

Named volumes: `postgres-data`, holding the Postgres data directory, and `redis-data`, holding the Redis append-only file.

The `backend` and the `frontend` services **pull published images**:

```text
ghcr.io/gitopslovers/gitpaas-backend:${IMAGE_TAG:-latest}
ghcr.io/gitopslovers/gitpaas-frontend:${IMAGE_TAG:-latest}
```

## Development vs. production

In development, only the dependencies (`postgres`, `redis`, `pgadmin`, `redisinsight`) run in compose. The backend and the frontend run on the host with `pnpm dev`. In production, every part of the stack — `postgres`, `redis`, `backend` and `frontend` — runs in compose, from the published images above.
