# Monorepo architecture

This document shows the layout and the tools of the GitPaaS repository. The repository is a pnpm workspace with two applications. Turborepo controls the tasks.

The workspace declares `apps/*` and `packages/*`. Today only `apps/backend` (the NestJS API) and `apps/frontend` (the Angular SPA) exist. There are no shared packages. The root scripts send each task to all the applications through Turborepo. Each application keeps its own tools and its own script code.

## Sections

- [Stack](./monorepo-architecture/stack.md): the tools used for each concern.
- [Structure](./monorepo-architecture/structure.md): the repository tree.
- [Conventions](./monorepo-architecture/conventions.md): package naming, shared script names, version pins and dependencies.
- [Operations](./monorepo-architecture/operations.md): root scripts and CI workflows.
