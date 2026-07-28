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

### Environment variables

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

### Local infrastructure

GitPaaS deploys applications by driving a **remote Docker daemon over mTLS** (see [infrastructure-architecture.md](./docs/infrastructure-architecture.md)). Locally, the stack in `iac/development/docker-compose.yml` reproduces everything the project depend on:

- **`server emulator`**: a Docker-in-Docker (DinD) container that emulates a remote server. Its daemon listens on TLS `127.0.0.1:2376`, and everything GitPaaS deploys lives inside it.
- **`postgres`**: the application database.
- **`redis`**: buffers and fan-outs real-time deployment logs streamed to the browser over SSE.
- **`pgadmin`**: web UI for the local Postgres at `http://127.0.0.1:5050`.
- **`redisinsight`**: web UI for the local Redis at `http://127.0.0.1:5540`.

You can set up the development environment using the following commands. You must run them from `iac/development/`:

```bash
cd iac/development

docker compose up -d --wait                                # Start and wait until healthy
docker compose down                                        # Stop (keeps images/volumes)
docker compose logs -f server                              # Follow a service's logs
docker compose down -v && rm -rf ../../.dev/server-certs   # Wipe all state
```

On first `docker compose up` the `server` container generates TLS certificates and shares the client certs with the host under `.dev/server-certs/client/`; the backend reads them from there. Ports `8080`→`80` and `8443`→`443` on the `server` are reserved for a future reverse proxy for deployed apps.

### Database schema and migrations

In devevlopment, TypeORM `synchronize` is on, so schema changes to entities are applied automatically on backend boot.

Schema changes are nonetheless shipped as **versioned migrations**. So whenever you add or change an entity, generate a migration and commit it alongside your change, from `apps/backend`:

```bash
pnpm --filter backend migration:generate src/migrations/<DescriptiveName>   # Diff entities → new migration
pnpm --filter backend migration:revert                                      # Undo the last applied migration
```

Review the generated file before committing.

## Running the apps

With the dev stack healthy, you can run the apps with the following commands:

| Script            | Runs                    | Purpose                  |
|-------------------|-------------------------|--------------------------|
| `pnpm dev`        | `turbo run dev`         | Start apps in watch mode |
| `pnpm build`      | `turbo run build`       | Build apps               |
| `pnpm lint`       | `turbo run lint`        | Lint apps                |
| `pnpm test`       | `turbo run test`        | Run apps' unit tests     |
| `pnpm check-types`| `turbo run check-types` | Type-check apps          |

## Testing

Run the affected app's tests before pushing, and keep them green:

- **All apps:** `pnpm test` from the root.
- **Backend:** unit tests run on Jest (`pnpm --filter backend test`).
- **Frontend:** unit tests run on Vitest (`pnpm --filter frontend test`).

Add or update tests for any behavior you change. When you cannot run the app's tests (for example, a docs-only change), say so in the PR.

## Coding conventions

- **TypeScript everywhere**, with the strictness the apps already enforce. Follow the layered structure each app uses rather than inventing new patterns.
- **Styling** uses Sass/Tailwind as configured in the frontend.
- **Linting** is enforced with ESLint via `pnpm lint`. Match the existing style; do not disable rules to get code through.

If you have questions about the project, read the documentation files in `docs`.

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
