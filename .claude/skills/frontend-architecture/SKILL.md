---
name: frontend-architecture
description: The architecture of `apps/frontend`. Use it before you write, move, test or audit a file of that application. It routes to the page of `docs/architecture/frontend/` that answers your question, and those pages are the single source of truth.
---

# The architecture of the frontend of GitPaaS

This skill is a map, and not a copy. The pages of `docs/architecture/frontend/` hold the detail, and they win over any other statement. The application is an SPA of Angular with Tailwind CSS. `apps/frontend/src/app/` holds `features/`, `layout/`, `pages/` and `shared/`.

Find the heading with `rtk grep -n`, then read the range with `Read`. Never read the whole page.

## The reference files

| The file | Read it when | The heading |
| --- | --- | --- |
| [traps.md](references/traps.md) | You start any task of `apps/frontend`. It holds the one rule and the four traps. | — |
| [structure.md](../../../docs/architecture/frontend/structure.md) | You place a file, or a route must reach a page, or you need what `shared/` holds. | `## Bootstrap and routing`, `## Per-feature layout`, `## Layout and pages`, `## Shared` |
| [conventions.md](../../../docs/architecture/frontend/conventions.md) | You need the border between a page and a container, and where a parameter of a route enters. | `## Layering` |
| [conventions.md](../../../docs/architecture/frontend/conventions.md) | A feature reads or writes over HTTP, and you need the shape that crosses the wire. | `## API repositories` |
| [conventions.md](../../../docs/architecture/frontend/conventions.md) | You write a component, and you name its file, its selector and its class. | `## Containers`, `## Presentational components` |
| [conventions.md](../../../docs/architecture/frontend/conventions.md) | You place the state, or you need which import takes an alias. | `## State`, `## Path aliases` |
| [stack.md](../../../docs/architecture/frontend/stack.md) | You choose the library that takes a concern, or you need the runner of the specs. | — |
| [key-flows.md](../../../docs/architecture/frontend/key-flows.md) | You need why a flow is built this way, or how the authentication refreshes a token. | One `##` for one flow |
| [operations.md](../../../docs/architecture/frontend/operations.md) | You need the command that an operator runs. | — |

## The neighbouring skills

- `tailadmin-ui-patterns` holds the components of the dashboard and their classes of Tailwind. Invoke it when you build a screen, and keep this skill for the structure.
- `frontend-unit-testing` holds the conventions of a spec.
- `angular-developer` holds the general documentation of the framework. This skill wins over it.
