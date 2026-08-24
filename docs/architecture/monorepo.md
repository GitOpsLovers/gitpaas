# Monorepo architecture

This document shows the layout and the tools of the GitPaaS repository. The repository is a pnpm workspace with two applications. Turborepo controls the tasks.

The workspace declares `apps/*` and `packages/*`. Today `apps/backend` (the NestJS API) and `apps/frontend` (the Angular SPA) hold the two applications, and `packages/contracts` holds the one shared package: the Zod schemas that both applications import as the wire contract of the API. The root scripts send each task to all the workspace packages through Turborepo. Each package keeps its own tools and its own script code.

## Sections

- [Stack](./monorepo/stack.md): the tools used for each concern.
- [Structure](./monorepo/structure.md): the repository tree.
- [Conventions](./monorepo/conventions.md): package naming, shared script names, version pins and dependencies.
- [Operations](./monorepo/operations.md): root scripts and CI workflows.
