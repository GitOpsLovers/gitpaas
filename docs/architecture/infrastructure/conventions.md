# Conventions

- **The environment gives the configuration.** `iac/production/.env.example` is the full contract, and the operator copies it to `.env`. Compose reads it for the `${…}` interpolation, and `env_file` gives it to the backend. The backend validates each variable at boot and stops if one is wrong. There is no silent default. Never commit a real `.env`.

- **The secrets stay out of the images.** Every credential arrives at runtime through `.env`. No layer holds sensitive data.

- **The access to Docker is a mount plus a group.** The backend reaches the daemon through the bind-mounted `/var/run/docker.sock`. Its image runs as the non-root `node` user, so the service declares `group_add: ["${DOCKER_GID}"]` with the docker group id that the installer detects.

  **That mount gives the backend the equivalent of root on the host.** Anything that speaks to the daemon can start a privileged container and take the machine, so an attack on the backend — or on an account that deploys through it — is an attack on the server. The non-root user does not change this. It is the accepted trade-off of the single-server model: give the host to GitPaaS alone, and trust its users as operators of that host.

- **The frontend carries no address.** `environment.ts` gives the SPA the relative path `/api/v1`, so the browser calls whatever host served the page, and nginx passes `/api/` to the `backend` service. The SPA runs in the browser, outside the compose network, so `http://backend:3000` would never resolve for it; nginx runs inside it, so the name resolves there. One published image therefore works at any address, with nothing to configure.

- **The version pins are declared, not shared.** `.tool-versions` records the Node and pnpm versions, the Dockerfiles repeat them as `ARG` defaults, and the release workflow passes them again as `build-args`. Nothing reads `.tool-versions`, so a changed pin must be edited in each place by hand.

## Environment contract

| Group           | Variables                                                                                                                                       |
|-----------------|-------------------------------------------------------------------------------------------------------------------------------------------------|
| Image selection | `IMAGE_TAG` (tag of the published images the stack runs; `latest` if empty)                                                                     |
| Host ports      | `BACKEND_PORT`, `FRONTEND_PORT`                                                                                                                 |
| Backend runtime | `NODE_ENV`, `PORT`, `CORS_ORIGIN`, `APP_BASE_URL`, `THROTTLE_TTL`, `THROTTLE_LIMIT`, `THROTTLE_STREAM_TTL`, `THROTTLE_STREAM_LIMIT`             |
| Deployment logs | `LOGS_MAX_LINES` (per-deployment line cap, example value `5000`)                                                                                |
| Redis           | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (optional; empty when the server needs no authentication)                                          |
| PostgreSQL      | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`                                  |
| Secrets         | `SECRETS_ENCRYPTION_KEY` (32 random bytes, hex; encrypts every stored provider private key and every secret variable of a service at rest)      |
| Docker          | `DOCKER_GID` (host docker group id; consumed only by compose's `group_add`)                                                                     |
| Reverse proxy   | `PROXY_ACME_PATH` (path of the store of ACME the backend reads to report the state of a certificate; empty takes the default `/acme/acme.json`) |
| JWT             | `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`                                                    |

The file carries no build argument, because CI builds the images and not the server. The frontend needs no variable of its own.

- `DOCKER_GID` is the only variable that compose alone uses, and the stack does not start without it. The backend validates every other variable, except the `POSTGRES_*` pair.
- `IMAGE_TAG` selects a runtime image. The installer derives it from the release tag without the leading `v` (`v1.4.0` gives `1.4.0`), and it refreshes the value on each run.
- `CORS_ORIGIN` no longer governs the SPA, whose calls are same-origin through the proxy. It applies to a caller that reaches the API directly from another origin.

## The API proxy

Two settings of the `/api/` block in `nginx.conf` are load-bearing:

- **The resolver.** nginx finds `backend` through Docker's DNS at `127.0.0.11`, with a variable in `proxy_pass`. A literal address is resolved once at start, goes stale when the container is recreated, and yields `502` until nginx restarts.
- **No buffering, and a long read timeout.** The deployment log is a Server-Sent Events stream. A buffering proxy holds every line until the run ends, and the default 60-second timeout cuts a quiet stream short.
