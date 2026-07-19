# Contributing

Thanks for contributing to **Artifactory**, a self-hostable PaaS for deploying personal projects. This repo is a [Turborepo](https://turborepo.dev) monorepo managed with pnpm workspaces; the backend is [NestJS](https://nestjs.com) and the frontend is [Angular](https://angular.dev), both TypeScript.

For architecture and design context, start with the docs and come back here for the day-to-day workflow:

- [Backend architecture](./docs/backend-architecture.md) — layering, modules, data flow
- [Backend business logic](./docs/backend-business.md) — how the deploy engine behaves
- [Frontend architecture](./docs/frontend-architecture.md) — layering, containers vs. components
- [Infrastructure architecture](./docs/infrastructure-architecture.md) — control plane vs. workload plane, dev/prod topology, release images
- [Deployment roadmap](./docs/deployment-roadmap.md) — where the platform is headed

## Prerequisites

- **Node** `26.1.0` and **pnpm** `11.1.3` — both pinned in `.tool-versions`. Using a version manager (asdf, mise, `corepack`) that reads `.tool-versions` is the easiest way to match them.
- **Docker** running on your host — the local dev stack runs entirely in containers.

## Setup

Install all workspace dependencies from the repo root:

```bash
pnpm install
```

### Environment configuration

The backend validates its environment at boot and **fails fast if any variable is missing or malformed** — there are no code-level fallbacks, in any environment including development. Copy the template and fill in every value before running:

```bash
cp apps/backend/.env.example apps/backend/.env
```

The variables cover: runtime (`NODE_ENV`, `PORT`), CORS (`CORS_ORIGIN`), rate limiting (`THROTTLE_TTL`/`THROTTLE_LIMIT` and the SSE-stream pair `THROTTLE_STREAM_TTL`/ THROTTLE_STREAM_LIMIT`), PostgreSQL (`DB_*`), Redis (`REDIS_*`), the GitHub App (`GITHUB_APP_*`), the VPS Docker daemon (`VPS_DOCKER_*`), and JWT auth (`JWT_ACCESS_SECRET`/`JWT_ACCESS_EXPIRES_IN` and `JWT_REFRESH_SECRET`/`JWT_REFRESH_EXPIRES_IN`).
The JWT secrets have no defaults — generate strong random values.

## Local development stack

Artifactory deploys applications by driving a **remote Docker daemon over mTLS** (see [infrastructure-architecture.md](./docs/infrastructure-architecture.md)). Locally, the stack in `iac/development/docker-compose.yml` reproduces everything the apps depend on:

- **`vps`** — a Docker-in-Docker (DinD) container that emulates the remote VPS. Its daemon listens on TLS `127.0.0.1:2376`, and everything Artifactory deploys lives inside it.
- **`postgres`** — the application database. On a fresh volume it seeds an initial admin user for login (`admin@artifactory.com` / `artifactory`).
- **`redis`** — buffers and fan-outs real-time deployment logs streamed to the browser over SSE.
- **`pgadmin`** — web UI for the local Postgres at http://127.0.0.1:5050.
- **`redisinsight`** — web UI for the local Redis at http://127.0.0.1:5540.

Bring the stack up (and wait for health) before running the apps, and manage it with Docker Compose from `iac/development/`:

```bash
cd iac/development

docker compose up -d --wait                             # start and wait until healthy
docker compose down                                     # stop (keeps images/volumes)
docker compose logs -f vps                              # follow a service's logs
docker compose down -v && rm -rf ../../.dev/vps-certs   # wipe all state
```

On first `docker compose up` the `vps` container generates TLS certificates and shares the client certs with the host under `.dev/vps-certs/client/`; the backend reads them from there. Ports `8080`→`80` and `8443`→`443` on the `vps` are reserved for a future reverse proxy for deployed apps.

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

The backend builds its Docker client from `VPS_DOCKER_HOST`, `VPS_DOCKER_PORT` and `VPS_DOCKER_CERT_PATH` (typical local values: `127.0.0.1`, `2376`, and `../../.dev/vps-certs/client`).

All backend routes are served under the `api/v1` prefix, and every endpoint requires a JWT access token by default. The readiness probe is public and actively checks Postgres, Redis, and the VPS Docker daemon — use it to verify the whole stack is wired up:

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

This project uses **[Conventional Commits](https://www.conventionalcommits.org)**, and it is not just a style preference: **semantic-release reads your commit messages to compute the next version** (see [Release process](#release-process)). Get the type right.

```
<type>(optional scope): <short summary>

[optional body]

[optional footer, e.g. BREAKING CHANGE: ...]
```

Common types and how they affect a release:

| Commit type                                              | Example                                  | Release impact   |
|----------------------------------------------------------|------------------------------------------|------------------|
| `fix:`                                                   | `fix(auth): reject expired refresh token`| Patch (x.y.**z**)|
| `feat:`                                                  | `feat(projects): add project archiving`  | Minor (x.**y**.0)|
| any type with `!` or `BREAKING CHANGE:` footer           | `feat!: drop v0 deploy API`              | Major (**x**.0.0)|
| `docs:`, `chore:`, `refactor:`, `test:`, `ci:`, `style:` | `docs: expand contributing guide`        | No release       |

### Branches and pull requests

- Branch off `main` using a short, descriptive name (e.g. `feat/project-archiving`, `fix/refresh-token-expiry`).
- Keep commits scoped and messages in the Conventional Commits format.
- Open your PR **against `main`**. Ensure the affected apps' lint, type-check, and unit tests pass first.
- Because release notes and versions are generated from commit messages, a clear, correctly-typed history directly shapes the changelog.

## Release process

Releases are **cut manually**, not on every merge to `main`. A maintainer triggers the `Release` GitHub Actions workflow (`workflow_dispatch`), which:

1. Runs **semantic-release** to compute the next version from the Conventional Commits since the last tag, then creates the git tag and GitHub Release with generated notes.
2. Only if a new release was published, builds and pushes multi-arch backend and frontend images to **GHCR** (`ghcr.io/gitopslovers/artifactory-backend` and `-frontend`), tagged with the resolved version and `latest`.

See [infrastructure-architecture.md](./docs/infrastructure-architecture.md) for the full image/deploy detail — this section is only a pointer.
