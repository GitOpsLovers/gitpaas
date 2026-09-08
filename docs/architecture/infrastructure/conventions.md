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
| Backend runtime | `NODE_ENV`, `PORT`, `CORS_ORIGIN`, `APP_BASE_URL`, `TRUST_PROXY_HOPS` (number of reverse proxies in front of the backend, default `1`), `THROTTLE_TTL`, `THROTTLE_LIMIT`, `THROTTLE_STREAM_TTL`, `THROTTLE_STREAM_LIMIT`             |
| Deployment logs | `LOGS_MAX_LINES` (per-deployment line cap, example value `5000`)                                                                                |
| Redis           | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (required in production; optional elsewhere, empty when the server needs no authentication)         |
| PostgreSQL      | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`                                  |
| Secrets         | `SECRETS_ENCRYPTION_KEY` (32 random bytes, hex; the backend validates the 64 hexadecimal characters at boot, and it refuses to start on a shorter or a malformed value; encrypts every stored provider private key and every secret variable of a service at rest)      |
| Docker          | `DOCKER_GID` (host docker group id; consumed only by compose's `group_add`)                                                                     |
| Reverse proxy   | `LETSENCRYPT_EMAIL`, `PROXY_ACME_PATH`                                                                                                          |
| Deployments     | `DEPLOY_SPOOL_DIR` (folder the repository of a deployment is extracted into; the temporary folder of the system when it is empty)               |
| JWT             | `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`, `JWT_2FA_SECRET`                                  |
| Database debug  | `PGADMIN_PORT` (host port of the console of the debug of the database, default `5050`), `PGADMIN_IMAGE` (pinned tag of the image, default `elestio/pgadmin:REL-9_17`) |

The file carries no build argument, because CI builds the images and not the server. The frontend needs no variable of its own.

- `DOCKER_GID` is the only variable that compose alone uses, and the stack does not start without it. The backend validates every other variable, except the `POSTGRES_*` pair.
- `IMAGE_TAG` selects a runtime image. The installer derives it from the release tag without the leading `v` (`v1.4.0` gives `1.4.0`), and it refreshes the value on each run.
- `CORS_ORIGIN` no longer governs the SPA, whose calls are same-origin through the proxy. It applies to a caller that reaches the API directly from another origin.
- `DEPLOY_SPOOL_DIR` is bound at the **same absolute path** on both sides, `${DEPLOY_SPOOL_DIR}:${DEPLOY_SPOOL_DIR}`, and compose passes it to the backend as well. The reason is the daemon: it runs on the host, so it reads the source of a bind mount against the root of the host, and a path that exists inside the container alone gives it a folder that is empty or absent. The backend extracts the repository under that folder, and it makes every relative bind source of a compose file absolute against it (see the capability [volumes](../../business/volumes.md#the-bind-mount-of-a-compose-file)). An empty value, and an absent one alike, take the temporary folder of the system, which is the case of a backend that runs on the host, in development.
- `PGADMIN_PORT` is the host port that the container of the console of the database publishes, while a session of the debug runs (see the capability [server](../../business/server.md#database-maintenance)). The operator must open this port on the firewall of the VPS, or an administrator outside the server cannot reach the console once a session starts.
- **Production tightens three checks.** When `NODE_ENV` holds `production`, the backend refuses to boot if `DB_HOST` names the machine of the backend itself (`localhost`, `127.0.0.1`, `::1`, `0.0.0.0` or `host.docker.internal`), and if `REDIS_PASSWORD` is absent. The three secrets of the JWT, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` and `JWT_2FA_SECRET`, must hold 32 characters or more in every environment, and not in production alone.
- `TRUST_PROXY_HOPS` tells Express how many reverse proxies stand in front of the backend (nginx alone, by default). The backend reads `request.ip` as the address that many hops back in the chain of `X-Forwarded-For`, so a forged header past that point never earns a fresh counter of a rate limit.

## The API proxy

Two settings of the `/api/` block in `nginx.conf` are load-bearing:

- **The resolver.** nginx finds `backend` through Docker's DNS at `127.0.0.11`, with a variable in `proxy_pass`. A literal address is resolved once at start, goes stale when the container is recreated, and yields `502` until nginx restarts.
- **No buffering, and a long read timeout.** The deployment log is a Server-Sent Events stream. A buffering proxy holds every line until the run ends, and the default 60-second timeout cuts a quiet stream short.

`nginx.conf` also publishes the backend on `127.0.0.1` alone, on the host, so only nginx reaches it directly; a caller from outside the machine goes through the proxy, and through its headers and its rate limit. Every response of the frontend carries a fixed set of security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` that closes the camera, the microphone, the geolocation, the payment API and the USB API, `Cross-Origin-Opener-Policy: same-origin`, `Strict-Transport-Security` and a `Content-Security-Policy` that allows the scripts and the styles of the application and the two origins of Google Fonts alone. Because nginx replaces the inherited headers of a block as soon as that block declares one of its own, each `location` of `nginx.conf` repeats the whole set.

## The rate limits of the authentication

`THROTTLE_TTL` and `THROTTLE_LIMIT` give the general rate limit of the API. Two routes of the authentication carry a limit of their own, declared with `@Throttle` on the controller and not through an environment variable: the login and the second step of the login accept 5 requests per 60 seconds from one client, and the refresh and the logout accept 10. See the requirement *Rate limit of the login* of the capability [auth](../../business/auth.md).
