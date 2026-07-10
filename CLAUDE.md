# Artifactory — Project conventions

## Tech stack

- **Monorepo:** Turborepo with pnpm workspaces
- **Package manager:** pnpm
- **Node:** 26.1.0 (pinned in `.tool-versions`)
- **Backend:** NestJS v11
- **Frontend:** Angular v22
- **Language:** TypeScript
- **Styling:** Saas
- **Database:** PostgreSQL via TypeORM
- **Linting:** ESLint v10 with `@gitopslovers/eslint-config-multistack`

## Monorepo Structure

```
├── apps/
│   ├── frontend/         # Next.js (App Router, React)
│   ├── backend/          # NestJS (Express)
│   └── backoffice/       # Angular standalone
├── iac/                  # Infrastructure (Docker, compose)
│   ├── backend/
│   ├── backoffice/
│   ├── frontend/
│   └── scraper/
├── packages/
│   └── domain/           # @agendamakinera/domain — shared entity models
├── .devcontainer/        # Dev container config
├── .vscode/              # VS Code workspace settings
├── .tool-versions        # Node/pnpm version pins
├── turbo.json            # Turborepo task pipeline
├── pnpm-workspace.yaml   # Workspace definition
└── package.json          # Root — only turborepo + shared tooling
```

## Shared Packages

### `@agendamakinera/domain` (`packages/domain/`)

Holds the canonical entity models shared by **all three apps**: `Artist`, `Event`, `Genre`, `Location`, `Venue`, `ScrapedEvent` (plus `LineupEntry`). `Event` is the aggregate: it embeds a `venue`, `genres[]`, a `lineup[]` (artist + `HH:mm` time slot), a `location` (`lat`/`lng` + `address`), `startsAt`/`closingTime`, `price`/`capacity`/`ageLimit`, and a `posterUrl`. All are pure TypeScript interfaces/types, so the package is consumed **type-only** — it ships no runtime JS.

- **Consume via** the bare specifier `@agendamakinera/domain` (declared as a
  `workspace:*` dependency in each app). Resolution is handled entirely by the package's
  `package.json` `exports`/`types` (pointing at `./src/index.ts`) via the pnpm workspace
  symlink — **no `tsconfig.json` `paths` alias is needed** in the consuming apps.
- **Single source of truth:** consume entity models from the package directly.
- After changing the package's dependency wiring, run `pnpm install` so the workspace link is created.

## App: Frontend (`apps/frontend/`)

### Structure

```
apps/frontend/
  src/
    app/                            # Next.js App Router (routing + RSC entry)
      layout.tsx                    # Root layout: <html>/<body>, fonts, SiteNav/SiteFooter, metadata
      page.tsx                      # /
      not-found.tsx                 # 404
      error.tsx                     # Route error boundary ('use client')
      global-error.tsx              # Root error boundary ('use client')
    assets/                         # Static images (tale covers, hero)
    core/
      infrastructure/
        api/                        # API connection settings (request helper)
    features/
      <feature>/
        domain/
          <feature>.models.ts       # Domain models & types
          <feature>.data.ts         # Static data/constants
          <feature>.repository.ts   # Repository interface
        application/
          <use-case>.use-case.ts    # Use cases (pure; called directly from RSC)
        infrastructure/
          api/                      # API repository + Server Actions (*.action.ts)
        ui/
          containers/               # Smart server components: fetch data (call use-cases), render components
          components/               # Presentational UI components (receive data via props)
    layout/                         # SiteNav, SiteFooter
    shared/
      components/                   # shadcn/ui components (kebab-case.tsx)
      hooks/                        # Shared hooks (kebab-case.tsx | .ts)
      lib/                          # Utilities (kebab-case.ts)
    styles.css                      # Global CSS (Tailwind v4 + theme); imported by src/app/layout.tsx
  next.config.ts                    # transpilePackages: ['@agendamakinera/domain']
  postcss.config.mjs                # @tailwindcss/postcss
```

> Next.js auto-detects the App Router at `src/app` when there is no top-level `app/`.

**Data flow:** `app/**/page.tsx` files must **never** interact with data or use-cases. A page only resolves its route inputs (`params`/`searchParams`) and renders a **container** from the feature (e.g. `<GenresList … />` from `features/genres/ui/containers/`); static `metadata`/`generateMetadata` also live in the page, but `generateMetadata` delegates to a feature-provided helper (e.g. `generateEventMetadata(slug)`) rather than calling a use-case itself. The **container** is the async Server Component that calls the use-cases directly (e.g. `getGenresUseCase(genresApiRepository, …)`) — no HTTP hop — and passes the data to presentational `components/` via props. Writes go through `'use server'` actions in `features/<feature>/infrastructure/api/*.action.ts`. The repository (`genresApiRepository`) is **server-only** and reads `process.env.GENRES_API_BASE_URL` — never import it from a `'use client'` component (so containers that fetch must stay server components).

### Path aliases

| Alias         | Path               |
|---------------|--------------------|
| `@core/*`     | `./src/core/*`     |
| `@features/*` | `./src/features/*` |
| `@layout/*`   | `./src/layout/*`   |
| `@shared/*`   | `./src/shared/*`   |
| `@/*`         | `./src/*`          |

### Scripts

| Script  | Command       |
|---------|---------------|
| `dev`   | `next dev`    |
| `build` | `next build`  |
| `start` | `next start`  |
| `lint`  | `eslint .`    |

### More information

If the agent needs more information about the frontend application, refer to the [frontend-architecture document](./docs/frontend-architecture.md) document.

---

## App: Backend (`apps/backend/`)

### Structure

```
apps/backend/src/
  main.ts               # NestFactory bootstrap
  app.module.ts         # Root module (imports DatabaseModule + feature modules)
  app.controller.ts     # Root controller
  app.service.ts        # Root service
  core/
  features/
    <feature>/
      domain/           # Models, interfaces and repositories
      infrastructure/         
        database/       # Implementation of the persistence layer with TypeORM
      ui/
        controllers/    # Feature-specific controllers
        services/       # Feature-specific services
```

### Path aliases

| Alias         | Path               |
|---------------|--------------------|
| `@features/*` | `./src/features/*` |

### Scripts

| Script       | Command              |
|--------------|----------------------|
| `dev`        | `nest start --watch` |
| `build`      | `nest build`         |
| `start`      | `nest start`         |
| `start:prod` | `node dist/main`     |
| `lint`       | `eslint .`           |
| `test`       | `jest`               |

### More information

If the agent needs more information about the backend application, refer to the [backend-architecture document](./docs/backend-architecture.md) document.

---

## App: Backoffice (`apps/backoffice/`)

### Structure

```
apps/backoffice/src/
  main.ts               # bootstrapApplication
  index.html            # SPA entry HTML
  styles.css            # Tailwind v4 import
  app/
    app.ts              # Root standalone component
    app.config.ts       # App config providers
    app.routes.ts       # Route definitions
    app.html            # Root component template
    app.css             # Root component styles
    features/
      <feature>/
        domain/
          models/       # Domain types/interfaces
        infrastructure/
          api/          # API data access layer
        ui/
          containers/   # Smart components connected to API
          components/   # Feature-specific UI components
    layout/
      ui/
        components/     # Layout components (sidebar, header, etc.)
        containers/     # Layout containers
        services/       # Layout services (sidebar, theme)
    pages/              # Page-level route components
    shared/
      components/       # Shared/reusable UI components
      pipes/            # Shared Angular pipes
```

### Path aliases

| Alias         | Path                           |
|---------------|--------------------------------|
| `@features/*` | `./src/app/features/*`         |
| `@layout/*`   | `./src/app/layout/*`           |
| `@pages/*`    | `./src/app/pages/*`            |
| `@shared/*`   | `./src/app/shared/*`           |

### Scripts

| Script  | Command |
|---------|---------|
| `dev`   | `ng serve` |
| `build` | `ng build` |
| `watch` | `ng build --watch --configuration development` |
| `test`  | `ng test` |

### More information

If the agent needs more information about the backoffice application, refer to the [backoffice-architecture document](./docs/backoffice-architecture.md) document.

---

## Work process

- The agent should never run ESLint; this is the user's responsibility.
- If new dependencies need to be installed, ask the user to install them, specifying which ones.

---

## Root Level

### Scripts

| Script | Command |
|--------|---------|
| `dev` | `turbo run dev` |
| `build` | `turbo run build` |
| `lint` | `turbo run lint` |
| `test` | `turbo run test` |

### Turborepo Pipeline

- `build`: depends on `^build` (parallelizable across apps).
- `dev`: no cache, persistent.
- `lint`: depends on `^lint`.

### Infrastructure (`iac/`)

```
iac/
  backend/               # Dokploy deployment for apps/backend (see iac/backend/README.md)
    Dockerfile           # Multi-stage build from the monorepo root → node dist/main.js (port 3000)
    docker-compose.yml   # Dokploy stack: db-init + backend, Traefik labels, external dokploy-network
    init-db.sh           # Bootstraps the app db/user on the managed PostgreSQL
  backoffice/            # Dokploy deployment for apps/backoffice
    Dockerfile           # Multi-stage build from the monorepo root → nginx serving the Angular SPA (port 8080)
    docker-compose.yml   # Dokploy stack: backoffice, external dokploy-network
    nginx.conf           # nginx config: SPA fallback + static asset caching
  frontend/              # Dokploy deployment for apps/frontend
    Dockerfile           # Multi-stage build from the monorepo root → Next.js standalone (port 3000)
    docker-compose.yml   # Dokploy stack: frontend, external dokploy-network
```

The frontend image builds from the **repo root** (compose `build.context: ../..`) using
`output: 'standalone'` in `next.config.ts` with `pnpm install --filter @agendamakinera/frontend...`
+ `next build`. The production stage is a Node.js Alpine image that runs the standalone server
(`server.js`) with `dumb-init`. Static assets are copied alongside. Deploy via Dokploy as a
**Compose** service pointing at `iac/frontend/docker-compose.yml`.

The backend image builds from the **repo root** (compose `build.context: ../..`) using
`pnpm install --filter @agendamakinera/backend...` + `nest build` + `pnpm deploy --prod --legacy`.
A root `.dockerignore` keeps the build context lean. Deploy via Dokploy as a **Compose** service
pointing at `iac/backend/docker-compose.yml`; PostgreSQL and MinIO (bucket `agenda-makinera`) are
expected on the external `dokploy-network`.

The backoffice image builds from the **repo root** (compose `build.context: ../..`) using
`pnpm install --filter @agendamakinera/backoffice...` + `ng build`. The production stage is an
nginx-alpine image that serves the built Angular SPA with SPA fallback routing. The Angular app
reads the API host from `environment.ts` (baked at build time). Deploy via Dokploy as a **Compose**
service pointing at `iac/backoffice/docker-compose.yml`.

## Git

- **Commits:** Conventional Commits (`feat:`, `chore:`, `fix:`, etc.).
- **No commit hooks** configured yet.

## Testing

| App | Framework | Pattern |
|-----|-----------|---------|
| Frontend | None configured | — |
| Backend | Jest | `*.spec.ts` in source tree |
| Backoffice | Vitest | Angular default |

## Environment

- No `.env` files committed.
- Backend uses `PORT` (default 3000) and `DATABASE_URL` (PostgreSQL).
- Frontend reads `API_BASE_URL` (default `http://localhost:3000`), server-only.
- Uploads (event posters) use **MinIO**: backend reads `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`,
  `MINIO_SECRET_KEY`, `MINIO_BUCKET` (set to `agenda-makinera`), plus optional `MINIO_PORT`,
  `MINIO_USE_SSL`, `MINIO_PUBLIC_ENDPOINT`, `MINIO_SET_PUBLIC_POLICY`.
- Client-exposed env vars must use the `NEXT_PUBLIC_*` prefix (none currently).

## Work method

- If new dependencies are required, ask the user to install them and specify which ones.