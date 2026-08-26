# Structure

`iac/` holds all the code that defines and sets up the infrastructure of the project.

## Production (`iac/production/`)

| File                    | Purpose                                            |
|-------------------------|----------------------------------------------------|
| `docker-compose.yml`    | Compose stack for the full control plane.          |
| `backend.Dockerfile`    | Builds the backend image.                          |
| `frontend.Dockerfile`   | Builds the frontend image, served by nginx.        |
| `nginx.conf`            | nginx configuration that the frontend image ships. |
| `migrations/`           | SQL schema files.                                  |
| `.env.example`          | Template for the operator's `.env`.                |

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

