# Monorepo architecture

This document shows the layout and the tools of the GitPaaS repository. The repository is a pnpm workspace with two applications. Turborepo controls the tasks.

## Overview

The workspace declares `apps/*` and `packages/*`. Today only `apps/backend` (the NestJS API) and `apps/frontend` (the Angular SPA) exist. There are no shared packages. The root scripts send each task to all the applications through Turborepo. Each application keeps its own tools and its own script code.

> The repository root has no `turbo.json` file. Thus `turbo run <task>` runs with no declared pipeline: no task dependencies, no inputs and no cache. To add a pipeline, use the `turborepo` skill (`.claude/skills/turborepo/`).

---

## Stack

| Concern         | Tool                                                          |
|-----------------|---------------------------------------------------------------|
| Package manager | pnpm 11.1.3 (`packageManager`, `.tool-versions`)              |
| Task runner     | Turborepo 2.10.5                                              |
| Runtime         | Node 26.1.0 (`engines`, `.tool-versions`)                     |
| Language        | TypeScript 6.0.3                                              |
| Linting         | ESLint 10 + `@gitopslovers/eslint-config-multistack`          |
| Release         | semantic-release (`.releaserc.json`, branch `main`)           |

---

## Structure

```text
├── .claude/              # AI instructions, skills, agents
├── .devcontainer/        # Dev container configuration
├── .github/workflows/    # CI: pr-verify.yml, release.yml
├── .vscode/              # Workspace settings
├── apps/
│   ├── backend/          # NestJS API
│   └── frontend/         # Angular SPA
├── docs/                 # Project documentation
├── iac/                  # development/ and production/ infrastructure
├── .dockerignore
├── .releaserc.json       # semantic-release configuration
├── .tool-versions        # Node/pnpm pins
├── CLAUDE.md             # Agent instructions
├── CONTRIBUTING.md
├── package.json          # Root scripts + turbo
├── pnpm-workspace.yaml   # Workspace definition
└── skills-lock.json      # AI skills lockfile
```

---

## Conventions

- The name of each workspace package is `@gitopslovers/gitpaas/<app>`.
- All the applications give the same script names (`dev`, `build`, `lint`, `test`). Thus the root command `turbo run <task>` operates in the same manner for each application.
- The Node and pnpm versions are set in one place (`.tool-versions`). The same values are copied into `engines`, `packageManager` and the Docker build arguments in `iac/production/`.
- Commits obey the Conventional Commits rules. The commits control the semantic version and the release notes.
- Each application declares its own runtime dependencies. The root declares only `turbo` and `typescript`.

---

## Operations

| Root script    | Command                 |
|----------------|-------------------------|
| `dev`          | `turbo run dev`         |
| `build`        | `turbo run build`       |
| `lint`         | `turbo run lint`        |
| `test`         | `turbo run test`        |
| `check-types`  | `turbo run check-types` |

Today, no application has an implementation of `check-types`.

| Workflow        | Trigger              | Does                                                                       |
|-----------------|----------------------|----------------------------------------------------------------------------|
| `pr-verify.yml` | PR to `main`         | `pnpm install --frozen-lockfile`, then `pnpm run lint` and `pnpm run test` |
| `release.yml`   | `workflow_dispatch`  | semantic-release, then multi-arch image publish (see infrastructure doc)   |

---

## Related docs

- [Backend architecture](./backend-architecture.md)
- [Frontend architecture](./frontend-architecture.md)
- [Infrastructure architecture](./infrastructure-architecture.md)
