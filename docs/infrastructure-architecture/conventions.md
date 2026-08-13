# Conventions

- **The environment gives the configuration.** `iac/production/.env.example` gives the full contract. The operator copies it to `.env`. Compose loads `.env` automatically for the `${…}` interpolation and, with `env_file`, as the runtime configuration of the backend. The backend validates each variable at boot and stops immediately if a variable is not correct. There are no silent default values. Do not commit a real `.env` file.
- **The secrets stay out of the images.** Each credential comes at runtime through `.env`. No sensitive data is put in a layer.
- **The access to Docker is a mount plus a group.** The daemon is available through the bind-mounted `/var/run/docker.sock` socket. The backend image runs as the non-root `node` user. Thus the service declares `group_add: ["${DOCKER_GID}"]` with the docker group id of the host, which the installer finds and writes to `.env`. Then the container can use the socket. **The mount of the socket gives the backend the equivalent of root access on the host.** Any process that can speak to the daemon can start a privileged container and get control of the machine. Thus an attack on the backend, or on an account that can deploy through the backend, is equal to an attack on the server. A container that runs as a non-root user does not change this. This is the accepted trade-off of the single-server model. To decrease the risk, use the host only for GitPaaS and give the GitPaaS users the trust level of an operator of that host.
- **The version pins stay in one place** (`.tool-versions`) and go into the compose build arguments and into CI.

## Environment contract

| Group             | Variables                                                                                                           |
|-------------------|---------------------------------------------------------------------------------------------------------------------|
| Build / ports     | `NODE_VERSION`, `PNPM_VERSION`, `IMAGE_TAG`, `BACKEND_PORT`, `FRONTEND_PORT`                                        |
| Backend runtime   | `NODE_ENV`, `PORT`, `CORS_ORIGIN`, `THROTTLE_TTL`, `THROTTLE_LIMIT`, `THROTTLE_STREAM_TTL`, `THROTTLE_STREAM_LIMIT` |
| Deployment logs   | `LOGS_MAX_LINES` (per-deployment line cap, example value `5000`)                                                    |
| Redis             | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (optional; empty when the server needs no authentication)              |
| PostgreSQL        | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`      |
| GitHub App        | `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` (base64 PEM), `GITHUB_APP_INSTALLATION_ID`                                |
| Docker            | `DOCKER_GID` (host docker group id; consumed only by compose's `group_add`)                                         |
| JWT               | `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`                        |

Only compose uses `DOCKER_GID`. This variable is necessary, and the stack does not start without it. The backend validates each other variable, but not the `POSTGRES_*` pair.
