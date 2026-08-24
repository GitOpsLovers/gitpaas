---
name: frontend-architecture
description: The architecture of the frontend application (`apps/frontend`). Use it before you write, move, test or audit a file of `apps/frontend`, and when you need the layers of a feature, the border between a page and a container, the repositories of the API, the state of the signals, the naming of a component, or the path aliases. It routes to the pages of `docs/architecture/frontend/`, which hold the detail.
---

# The architecture of the frontend of GitPaaS

This skill is a map, and not a copy. **The pages of `docs/architecture/frontend/` are the single
source of truth.** If this file and a page disagree, the page wins, and you report the disagreement.

The application is an Angular SPA with Tailwind CSS. `apps/frontend/src/app/` holds `features/`,
`layout/`, `pages/` and `shared/`. A feature holds three layers: `domain/models/`,
`infrastructure/{api,storage}/` and `ui/{containers,components,guards,interceptors,services}/`.

## The one rule

**Depend inward only.** An outer layer depends on an inner layer, and an inner layer never depends
on an outer layer. `domain/` must not import `infrastructure/` or `ui/`. The business logic stays in
the feature, and never in a page.

## The page that answers your question

Read the section that you need, and not the whole page.

| Your question | The page |
|---|---|
| Which folder takes this file? How does a route reach a page? What does `shared/` hold? | [structure.md](../../../docs/architecture/frontend/structure.md) |
| What does a page do, and what does a container do? Where do the route parameters enter? | [conventions.md](../../../docs/architecture/frontend/conventions.md) section "Layering" |
| How does a feature read and write over HTTP? Which shape crosses the wire? | [conventions.md](../../../docs/architecture/frontend/conventions.md) section "API repositories" |
| How do I write a component? How do I name its file, its selector and its class? | [conventions.md](../../../docs/architecture/frontend/conventions.md) sections "Containers" and "Presentational components" |
| Where does the state live? Which import takes an alias? | [conventions.md](../../../docs/architecture/frontend/conventions.md) sections "State" and "Path aliases" |
| Which library takes this concern? Which runner runs the specs? | [stack.md](../../../docs/architecture/frontend/stack.md) |
| Why is the flow built this way? How does the authentication refresh a token? | [key-flows.md](../../../docs/architecture/frontend/key-flows.md) |
| Which command does an operator run? | [operations.md](../../../docs/architecture/frontend/operations.md) |

## The four traps

These rules break the most often. The pages above hold the reason of each one.

1. **A read uses `httpResource`, and a mutation uses `HttpClient`.**
2. **A presentational component injects no service.** It uses `input()`, `input.required()` and
   `output()`, and no `@Input()` decorator.
3. **The name of the file is `<name>.component.ts` and `<name>.component.html`.** If an import path
   is wrong, correct the import. Never rename the file.
4. **Use the per-icon components of `@lucide/angular`** (`<svg lucideX>`), and not the dynamic
   module.

## For the classes of the interface

The skill `tailadmin-ui-patterns` holds the components of the dashboard and their Tailwind classes.
Invoke it when you build a screen, and keep this skill for the structure.
