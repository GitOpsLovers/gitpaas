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

## Monorepo structure

```
├── apps/
│   ├── backend/          # NestJS
│   └── frontend/         # Angular
├── .devcontainer/        # Dev container configuration
├── .vscode/              # VS Code workspace settings
├── .tool-versions        # Node/pnpm version pins
├── turbo.json            # Turborepo task pipeline
├── pnpm-workspace.yaml   # Workspace definition
└── package.json          # Root dependencies
```

---

## App: Backend (`apps/backend/`)

### Structure

```
apps/backend/src/
  main.ts               # NestFactory bootstrap
  app.module.ts         # Root module
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

## App: Frontend (`apps/frontend/`)

### Structure

```
apps/backoffice/src/
  main.ts               # bootstrapApplication
  index.html            # SPA entry HTML
  app/
    app.ts              # Root standalone component
    app.config.ts       # App config providers
    app.routes.ts       # Route definitions
    app.html            # Root component template
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

If the agent needs more information about the frontend application, refer to the [frontend-architecture document](./docs/frontend-architecture.md) document.

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

---

## Work process

- The agent should never run ESLint; this is the user's responsibility.
- If new dependencies need to be installed, ask the user to install them, specifying which ones.
- For any pure refactoring task delegate to the `refactorer` subagent instead of doing it inline. Give it the complete scope (exact goal + file paths) in the prompt, since it starts with no conversation history. Do not delegate bug fixes or new features to it.
- Whenever a change is made, run the tests on the affected apps using the commands defined in package.json