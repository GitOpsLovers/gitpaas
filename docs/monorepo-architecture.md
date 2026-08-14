# Monorepo architecture

This document shows the layout and the tools of the GitPaaS repository. The repository is a pnpm workspace with two applications. Turborepo controls the tasks.

The workspace declares `apps/*` and `packages/*`. Today only `apps/backend` (the NestJS API) and `apps/frontend` (the Angular SPA) exist. There are no shared packages. The root scripts send each task to all the applications through Turborepo. Each application keeps its own tools and its own script code.

> The repository root has no `turbo.json` file. Thus `turbo run <task>` runs with no declared pipeline: no task dependencies, no inputs and no cache. To add a pipeline, use the `turborepo` skill (`.claude/skills/turborepo/`).

## `docs/` and `openspec/`

The repository holds two kinds of written work, and the border between them is firm.

| Folder | Answers | Owned by |
|---|---|---|
| `docs/` | **How** the system is built — the structure, the layers, the data flow, and the reasons behind them | A person, or the `documenter` agent |
| `openspec/specs/` | **What** the system must do — each rule as a requirement, each case as a scenario | The commands `/opsx:propose` and `/opsx:sync` |
| `openspec/changes/` | What is planned and not yet released — the proposal, the design, the task list and the difference to the specifications | The commands of OpenSpec |

**Never write one in the other.** A page of the architecture that needs a rule links the capability of
`openspec/specs/`, and it does not restate it. Two copies of one rule go out of step, which is the failure
that the specifications exist to prevent. Nothing outside the commands of OpenSpec writes into `openspec/`.

A capability of the backend carries the name of its feature (`auth`, `deployments`, `services`). A
capability of the frontend carries the prefix `web-` (`web-signin`, `web-service-detail`), because
`openspec/specs/` is one flat name space and three routes of the frontend carry the name of a feature of the
backend.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the loop that an agent follows.

## Sections

- [Stack](./monorepo-architecture/stack.md): the tools used for each concern.
- [Structure](./monorepo-architecture/structure.md): the repository tree.
- [Conventions](./monorepo-architecture/conventions.md): package naming, shared script names, version pins and dependencies.
- [Operations](./monorepo-architecture/operations.md): root scripts and CI workflows.

## Related docs

- [Backend architecture](./backend-architecture.md)
- [Frontend architecture](./frontend-architecture.md)
- [Infrastructure architecture](./infrastructure-architecture.md)
