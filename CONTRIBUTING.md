# Contributing

Thanks for contributing to **GitPaaS**, a self-hostable PaaS for deploying personal projects. This repository is a monorepo managed with [Turborepo](https://turborepo.dev) and [pnpm](https://pnpm.io/) workspaces.

For architecture and design context, start with the documentation and come back here for the day-to-day workflow:

- [Backend architecture](./docs/backend-architecture.md)
- [Backend business logic](./docs/backend-business.md)
- [Frontend architecture](./docs/frontend-architecture.md)
- [Infrastructure architecture](./docs/infrastructure-architecture.md)

## Prerequisites

- **Node** `26.1.0` and **pnpm** `11.1.3` — both pinned in `.tool-versions`. Using a version manager (asdf, mise, `corepack`) that reads `.tool-versions` is the easiest way to match them.
- **Docker** running on your host.

## Setup

Install all workspace dependencies from the repository root:

```bash
pnpm install
```

### Environment configuration

Copy the template containing the environment variables needed to run the backend service.

```bash
cp apps/backend/.env.example apps/backend/.env
```

The variables cover: 

- Runtime: `NODE_ENV`, `PORT`
- Security: `CORS_ORIGIN`, `THROTTLE_TTL`/`THROTTLE_LIMIT`, `THROTTLE_STREAM_TTL`/ `THROTTLE_STREAM_LIMIT`
- PostgreSQL: `DB_*`
- Redis: `REDIS_*`, 
- GitHub App: `GITHUB_APP_*`, 
- Docker daemon: `SERVER_DOCKER_*`
- Authentication: `JWT_ACCESS_SECRET`/`JWT_ACCESS_EXPIRES_IN` and `JWT_REFRESH_SECRET`/`JWT_REFRESH_EXPIRES_IN`

## Development stack

GitPaaS deploys applications by driving a **remote Docker daemon over mTLS** (see [infrastructure-architecture.md](./docs/infrastructure-architecture.md)). Locally, the stack in `iac/development/docker-compose.yml` reproduces everything the apps depend on:

- **`server emulator`**: a Docker-in-Docker (DinD) container that emulates a remote server. Its daemon listens on TLS `127.0.0.1:2376`, and everything GitPaaS deploys lives inside it.
- **`postgres`**: the application database. It starts empty; TypeORM `synchronize` creates the schema on backend boot. TThe initial admin user (`admin@gitpaas.dev` / `gitpaas`) is seeded by the backend itself through a development-only bootstrap hook that runs after the server starts.
- **`redis`**: buffers and fan-outs real-time deployment logs streamed to the browser over SSE.
- **`pgadmin`**: web UI for the local Postgres at http://127.0.0.1:5050.
- **`redisinsight`**: web UI for the local Redis at http://127.0.0.1:5540.

Bring the stack up before running the apps, and manage it with Docker Compose from `iac/development/`:

```bash
cd iac/development

docker compose up -d --wait                                # start and wait until healthy
docker compose down                                        # stop (keeps images/volumes)
docker compose logs -f server                                 # follow a service's logs
docker compose down -v && rm -rf ../../.dev/server-certs   # wipe all state
```

On first `docker compose up` the `server` container generates TLS certificates and shares the client certs with the host under `.dev/server-certs/client/`; the backend reads them from there. Ports `8080`→`80` and `8443`→`443` on the `server` are reserved for a future reverse proxy for deployed apps.

### Database schema and migrations

In devevlopment, TypeORM `synchronize` is on, so schema changes to entities are applied automatically on backend boot.

Schema changes are nonetheless shipped as **versioned migrations**. So whenever you add or change an entity, generate a migration and commit it alongside your change, from `apps/backend`:

```bash
pnpm --filter backend migration:generate src/migrations/<DescriptiveName>   # diff entities → new migration
pnpm --filter backend migration:revert                                      # undo the last applied migration
```

Review the generated file before committing.

## Running the apps

With the dev stack healthy, run the apps from the repo root. Root scripts fan out to every workspace through Turborepo:

| Script            | Runs                    | Purpose                                             |
|-------------------|-------------------------|-----------------------------------------------------|
| `pnpm dev`        | `turbo run dev`         | Start all apps in watch mode (persistent, no cache) |
| `pnpm build`      | `turbo run build`       | Build all apps                                      |
| `pnpm lint`       | `turbo run lint`        | Lint all apps                                       |
| `pnpm test`       | `turbo run test`        | Run all apps' unit tests                            |
| `pnpm check-types`| `turbo run check-types` | Type-check all apps                                 |

To work on a single app, filter it: e.g. `pnpm --filter backend dev` (`nest start --watch`) or `pnpm --filter frontend dev` (`ng serve`).

The backend builds its Docker client from `SERVER_DOCKER_HOST`, `SERVER_DOCKER_PORT` and `SERVER_DOCKER_CERT_PATH` (typical local values: `127.0.0.1`, `2376`, and `../../.dev/server-certs/client`).

All backend routes are served under the `api/v1` prefix, and every endpoint requires a JWT access token by default. The readiness probe is public and actively checks Postgres, Redis, and the server Docker daemon — use it to verify the whole stack is wired up:

```bash
curl http://localhost:3000/api/v1/server/readiness
# { "status": "ok", "dependencies": [ { "name": "postgres", "status": "up" }, ... ] }
```

## Testing

Run the affected app's tests before pushing, and keep them green:

- **All apps:** `pnpm test` from the root (Turborepo runs each workspace's `test`).
- **Backend:** unit tests run on Jest (`pnpm --filter backend test`).
- **Frontend:** unit tests run on Vitest, non-watch (`pnpm --filter frontend test`, i.e. `ng test --watch=false`).

Add or update tests for any behavior you change. When you cannot run the app's tests (for example, a docs-only change), say so in the PR.

## Coding conventions

- **TypeScript everywhere**, with the strictness the apps already enforce. Follow the layered structure each app uses rather than inventing new patterns:
  - **Backend** — `domain/` (models, interfaces, repositories) → `infrastructure/` (TypeORM, external clients) → `ui/` (controllers, services), with thin use-case functions in `application/`. Aliases: `@features/*`, `@core/*`. See [backend-architecture.md](./docs/backend-architecture.md).
  - **Frontend** — `domain/` (models) → `infrastructure/` (API repositories) → `ui/` (smart `containers/` vs. presentational `components/`). Aliases: `@features/*`, `@layout/*`, `@pages/*`, `@shared/*`. See [frontend-architecture.md](./docs/frontend-architecture.md).
- **Styling** uses Sass/Tailwind as configured in the frontend.
- **Linting** is enforced with ESLint (`@gitopslovers/eslint-config-multistack`) via `pnpm lint`. Match the existing style; do not disable rules to get code through.

When in doubt about where something belongs, mirror the `projects` feature — it is the canonical reference example across both apps.

## Commit & PR conventions

This project follows the **[Conventional Commits](https://www.conventionalcommits.org)** convention for commit messages. Keep the history clean and the type accurate.

```
<type>(optional scope): <short summary>

[optional body]

[optional footer, e.g. BREAKING CHANGE: ...]
```

### Branches and pull requests

- Branch off `main` using a short, descriptive name (e.g. `feat/project-archiving`, `fix/refresh-token-expiry`).
- Keep commits scoped and messages in the Conventional Commits format.
- Open your PR **against `main`**. Ensure the affected apps' lint, type-check, and unit tests pass first.
