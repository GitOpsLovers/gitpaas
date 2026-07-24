# Monorepo architecture

Layout and tooling of the GitPaaS repository: a pnpm workspace of two applications orchestrated by Turborepo.

## Overview

The workspace declares `apps/*` and `packages/*`; only `apps/backend` (NestJS API) and `apps/frontend` (Angular SPA) exist today — there are no shared packages. Root scripts fan a task out to every app through Turborepo; each app owns its own toolchain and script implementations.

> `turbo.json` is not committed at the repo root, so `turbo run <task>` runs with no declared pipeline (no task dependencies, inputs, or caching). Use the `turborepo` skill (`.claude/skills/turborepo/`) when adding one.

## Stack

| Concern         | Tool                                                          |
|-----------------|---------------------------------------------------------------|
| Package manager | pnpm 11.1.3 (`packageManager`, `.tool-versions`)              |
| Task runner     | Turborepo 2.10.5                                              |
| Runtime         | Node 26.1.0 (`engines`, `.tool-versions`)                     |
| Language        | TypeScript 6.0.3                                              |
| Linting         | ESLint 10 + `@gitopslovers/eslint-config-multistack`          |
| Release         | semantic-release (`.releaserc.json`, branch `main`)           |

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

## Conventions

- Workspace packages are named `@gitopslovers/gitpaas/<app>`.
- Every app exposes the same script names (`dev`, `build`, `lint`, `test`) so root `turbo run <task>` works uniformly.
- Node and pnpm versions are pinned in one place (`.tool-versions`) and mirrored into `engines`, `packageManager`, and the Docker build args in `iac/production/`.
- Commits follow Conventional Commits; they drive semantic versioning and the release notes.
- Runtime dependencies are declared per app, never at the root; the root holds only `turbo` and `typescript`.

## Operations

| Root script    | Command                 |
|----------------|-------------------------|
| `dev`          | `turbo run dev`         |
| `build`        | `turbo run build`       |
| `lint`         | `turbo run lint`        |
| `test`         | `turbo run test`        |
| `check-types`  | `turbo run check-types` |

`check-types` has no implementation in either app today.

| Workflow        | Trigger              | Does                                                                       |
|-----------------|----------------------|----------------------------------------------------------------------------|
| `pr-verify.yml` | PR to `main`         | `pnpm install --frozen-lockfile`, then `pnpm run lint` and `pnpm run test` |
| `release.yml`   | `workflow_dispatch`  | semantic-release, then multi-arch image publish (see infrastructure doc)   |

## Related docs

- [Backend architecture](./backend-architecture.md)
- [Frontend architecture](./frontend-architecture.md)
- [Infrastructure architecture](./infrastructure-architecture.md)
