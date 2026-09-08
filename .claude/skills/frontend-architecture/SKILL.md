---
name: frontend-architecture
description: The architecture of `apps/frontend`, and the API reference of Angular. Use it before you write, move, test or audit a file of that application. It routes to the page of `docs/architecture/frontend/` that answers your question, and those pages are the single source of truth.
---

# The frontend of GitPaaS

`apps/frontend` is an SPA of Angular 22 with Tailwind CSS. `apps/frontend/src/app/` holds `features/`, `layout/`, `pages/` and `shared/`.

This skill holds two tiers:

- **The architecture of this project.** The pages of `docs/architecture/frontend/` hold the detail, and they win over any other statement, this skill included.
- **The API of Angular.** Read a file of `references/` when a question about the framework stays open after you read the page of the architecture.

Read one file for your task, and never the folder. In a page of `docs/`, find the heading with `rtk grep -n`, then read that range with `Read`.

## The architecture of this project

| The file | Read it when | The heading |
| --- | --- | --- |
| [traps.md](references/traps.md) | You start any task of `apps/frontend`. It holds the one rule and the five traps. | — |
| [structure.md](../../../docs/architecture/frontend/structure.md) | You place a file, or a route must reach a page, or you need what `shared/` holds. | `## Bootstrap and routing`, `## Per-feature layout`, `## Layout and pages`, `## Shared` |
| [conventions.md](../../../docs/architecture/frontend/conventions.md) | You need the border between a page and a container, where a parameter of a route enters, a feature that reads or writes over HTTP, a form, where the state lives, or which import takes an alias. | `## Layering`, `## API repositories`, `## Containers`, `## Presentational components`, `## Forms`, `## State`, `## Path aliases` |
| [stack.md](../../../docs/architecture/frontend/stack.md) | You choose the library that takes a concern, or you need the runner of the specs. | — |
| [key-flows.md](../../../docs/architecture/frontend/key-flows.md) | You need why a flow is built this way, or how the authentication refreshes a token. | One `##` for one flow |
| [operations.md](../../../docs/architecture/frontend/operations.md) | You need the command that an operator runs. | — |
| [arch-file-naming.md](references/arch-file-naming.md) | You name the file of a model, a use case, an API repository, or a presentational component. | — |
| [arch-class-function-naming.md](references/arch-class-function-naming.md) | You name the class or the selector of a page or a presentational component, or you name an `output()`. | — |
| [arch-known-deviations.md](references/arch-known-deviations.md) | You touch state management, a dynamic class, an event, a feature repository, or a host listener, and you need to know where the code still deviates from the canonical pattern. | — |
| [arch-layers.md](references/arch-layers.md) | You write into `application/` or `domain/constants/`, or a feature needs a helper of another feature. | — |

## The API of Angular

### Components

| The file | Read it when |
| --- | --- |
| [guidelines.md](references/guidelines.md) | You start a task of Angular. |
| [components.md](references/components.md) | You write a component: its anatomy, or its metadata. |
| [inputs.md](references/inputs.md) | You declare an input of a signal, a transform, or a model. |
| [outputs.md](references/outputs.md) | You declare an output of a signal. |
| [host-elements.md](references/host-elements.md) | You bind the host element, or you inject an attribute. |

### Signals

| The file | Read it when |
| --- | --- |
| [signals-overview.md](references/signals-overview.md) | You need `signal`, `computed`, a reactive context, or `untracked`. |
| [linked-signal.md](references/linked-signal.md) | You need a writable state that follows a source signal. |
| [resource.md](references/resource.md) | You read asynchronous data into the state of a signal, with `httpResource` or `rxResource`. |
| [effects.md](references/effects.md) | You need `effect` or `afterRenderEffect`, or you must know when not to use one. |

### Injection

| The file | Read it when |
| --- | --- |
| [dependency-injection.md](references/dependency-injection.md) | You need `@Injectable()`, `inject()`, the injection context, `runInInjectionContext`, `providedIn: 'root'`, a manual provider, or the hierarchy of the injectors. |

### Routing

| The file | Read it when |
| --- | --- |
| [define-routes.md](references/define-routes.md) | You declare a path, a dynamic segment, a wildcard or a redirection. |
| [loading-strategies.md](references/loading-strategies.md) | You choose between the eager loading and the lazy loading of a route. |
| [show-routes-with-outlets.md](references/show-routes-with-outlets.md) | You place `<router-outlet>`, or you nest one. |
| [navigate-to-routes.md](references/navigate-to-routes.md) | You navigate with `RouterLink`, or with the service `Router`. |
| [route-guards.md](references/route-guards.md) | You write `CanActivate`, `CanMatch` or another guard. |

### Configuration

| The file | Read it when |
| --- | --- |
| [environment-configuration.md](references/environment-configuration.md) | You configure the application at the build. |

## The neighbouring skills

- `frontend-design` holds the theme of Tailwind, the markup of the dashboard and the practice of Tailwind v4. Invoke it when you build a screen, and keep this skill for the structure.
- `frontend-unit-testing` holds every convention of a spec. This skill holds none.
