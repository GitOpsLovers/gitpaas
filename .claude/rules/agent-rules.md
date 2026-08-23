# The card of the architecture rules

This page is the short reference for an agent. It gives the layers, the one rule of the dependencies
and the path aliases of the two applications. Read this page instead of the four long pages.

Read a long page only if this card does not answer your question:

| The subject | The page |
|---|---|
| The layout of a feature of the backend, the module wiring, the cross-cutting concerns | [backend structure](../../docs/backend-architecture/structure.md) |
| The ports, the transformers, the validation, the naming of a file and of a class | [backend conventions](../../docs/backend-architecture/conventions.md) |
| The routes, the layout of a feature of the frontend, the shared folder | [frontend structure](../../docs/frontend-architecture/structure.md) |
| The containers, the repositories of the API, the presentational components, the state | [frontend conventions](../../docs/frontend-architecture/conventions.md) |

## The one rule

**Depend inward only.** An outer layer depends on an inner layer, and an inner layer never depends on
an outer layer.

- `domain/` must not import `infrastructure/` or `ui/`.
- `core/` must never import a feature.

## The layers of the backend

`apps/backend/src/` holds `core/`, `features/` and `shared/`. `features/` is the location by default.
A feature holds four layers:

| The layer | It holds | It knows |
|---|---|---|
| `domain/` | The models, the ports, the repositories, the DTOs, the errors, the constants | Nothing outside itself |
| `application/` | One pure function for one use case. It receives each dependency as a parameter | `domain/` |
| `infrastructure/` | The adapter of each port, in a folder named after the technology | `domain/` |
| `ui/` | The controllers, the services, the guards, the decorators | The three layers above |

Two rules break the most often:

- A use case is a pure function, and it receives each collaborator as a parameter. Only the adapter
  is an `@Injectable()` provider.
- A repository of the infrastructure never returns an ORM shape. An adjacent `*.transformer.ts` file
  maps the shape into a domain model.

## The layers of the frontend

`apps/frontend/src/app/` holds `features/`, `layout/`, `pages/` and `shared/`. A feature holds three
layers: `domain/models/`, `infrastructure/{api,storage}/` and `ui/{containers,components,guards,interceptors,services}/`.

- The business logic stays in the feature, and never in a page. A page is thin, and it injects no
  service.
- A container injects the repository, holds the signals of the state, and sends the commands.
- A presentational component injects no service. It uses `input()`, `input.required()` and `output()`,
  and no `@Input()` decorator.
- A read uses `httpResource`. A mutation uses `HttpClient`.
- A component file is `<name>.component.ts` and `<name>.component.html`. If an import path is wrong,
  correct the import. Never rename the file.
- Use the per-icon components of `@lucide/angular` (`<svg lucideX>`). Do not use the dynamic module.

## The path aliases

Use an alias for an import between features, and for an import of `core` or of `shared`. Use a
relative path inside one feature.

| The application | The alias | The path |
|---|---|---|
| Backend | `@core/*` | `./src/core/*` |
| Backend | `@features/*` | `./src/features/*` |
| Backend | `@shared/*` | `./src/shared/*` |
| Frontend | `@features/*` | `./src/app/features/*` |
| Frontend | `@layout/*` | `./src/app/layout/*` |
| Frontend | `@pages/*` | `./src/app/pages/*` |
| Frontend | `@shared/*` | `./src/app/shared/*` |
| Frontend | `@environments/*` | `./src/environments/*` |

## The tests

The backend runs Jest. A spec lives in a sibling folder `__tests__/`, and its name is `*.spec.ts`.
The frontend runs Vitest, through the Angular builder `@angular/build:unit-test`.
