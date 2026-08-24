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
| [traps.md](references/traps.md) | You start any task of `apps/frontend`. It holds the one rule and the four traps. | — |
| [structure.md](../../../docs/architecture/frontend/structure.md) | You place a file, or a route must reach a page, or you need what `shared/` holds. | `## Bootstrap and routing`, `## Per-feature layout`, `## Layout and pages`, `## Shared` |
| [conventions.md](../../../docs/architecture/frontend/conventions.md) | You need the border between a page and a container, and where a parameter of a route enters. | `## Layering` |
| [conventions.md](../../../docs/architecture/frontend/conventions.md) | A feature reads or writes over HTTP, and you need the shape that crosses the wire. | `## API repositories` |
| [conventions.md](../../../docs/architecture/frontend/conventions.md) | You write a component, or you route parameters to a container. | `## Containers`, `## Presentational components` |
| [conventions.md](../../../docs/architecture/frontend/conventions.md) | You place the state, or you need which import takes an alias. | `## State`, `## Path aliases` |
| [stack.md](../../../docs/architecture/frontend/stack.md) | You choose the library that takes a concern, or you need the runner of the specs. | — |
| [key-flows.md](../../../docs/architecture/frontend/key-flows.md) | You need why a flow is built this way, or how the authentication refreshes a token. | One `##` for one flow |
| [operations.md](../../../docs/architecture/frontend/operations.md) | You need the command that an operator runs. | — |
| [arch-file-naming.md](references/arch-file-naming.md) | You name the file of a model, an API repository, or a presentational component. | — |
| [arch-class-function-naming.md](references/arch-class-function-naming.md) | You name the class or the selector of a page or a presentational component, or you name an `output()`. | — |
| [arch-known-deviations.md](references/arch-known-deviations.md) | You touch state management, and you need to know where the code still deviates from signals. | — |

## The API of Angular

### Components

| The file | Read it when |
| --- | --- |
| [guidelines.md](references/guidelines.md) | You start a task of Angular, or you choose the kind of form. |
| [components.md](references/components.md) | You write a component: its anatomy, its metadata, or the control flow of its template. |
| [inputs.md](references/inputs.md) | You declare an input of a signal, a transform, or a model. |
| [outputs.md](references/outputs.md) | You declare an output of a signal, or a custom event. |
| [host-elements.md](references/host-elements.md) | You bind the host element, or you inject an attribute. |

### Signals

| The file | Read it when |
| --- | --- |
| [signals-overview.md](references/signals-overview.md) | You need `signal`, `computed`, a reactive context, or `untracked`. |
| [linked-signal.md](references/linked-signal.md) | You need a writable state that follows a source signal. |
| [resource.md](references/resource.md) | You read asynchronous data into the state of a signal. |
| [effects.md](references/effects.md) | You need `effect` or `afterRenderEffect`, or you must know when not to use one. |

### Forms

| The file | Read it when |
| --- | --- |
| [signal-forms.md](references/signal-forms.md) | You write a new form. Prefer it. |
| [reactive-forms.md](references/reactive-forms.md) | You change a reactive form that exists. |
| [template-driven-forms.md](references/template-driven-forms.md) | You change a form driven by the template. |

### Injection

| The file | Read it when |
| --- | --- |
| [di-fundamentals.md](references/di-fundamentals.md) | You need the injection, a service, or the function `inject()`. |
| [creating-services.md](references/creating-services.md) | You create a service, or you use `providedIn: 'root'`. |
| [defining-providers.md](references/defining-providers.md) | You need `useClass`, `useValue`, `useFactory`, or a scope. |
| [injection-context.md](references/injection-context.md) | You call `inject()` outside a constructor, or you need `runInInjectionContext`. |
| [hierarchical-injectors.md](references/hierarchical-injectors.md) | You need the rules of the resolution, `optional`, `skipSelf`, or `viewProviders`. |

### Routing

| The file | Read it when |
| --- | --- |
| [define-routes.md](references/define-routes.md) | You declare a path, a dynamic segment, a wildcard or a redirection. |
| [loading-strategies.md](references/loading-strategies.md) | You choose between the eager loading and the lazy loading of a route. |
| [show-routes-with-outlets.md](references/show-routes-with-outlets.md) | You place `<router-outlet>`, or you nest one, or you name one. |
| [navigate-to-routes.md](references/navigate-to-routes.md) | You navigate with `RouterLink`, or with the service `Router`. |
| [route-guards.md](references/route-guards.md) | You write `CanActivate`, `CanMatch` or another guard. |
| [data-resolvers.md](references/data-resolvers.md) | You read the data before the route activates, with `ResolveFn`. |
| [router-lifecycle.md](references/router-lifecycle.md) | You need the order of the events of a navigation, or you debug one. |

### Styles and animations

| The file | Read it when |
| --- | --- |
| [component-styling.md](references/component-styling.md) | You write the styles of a component, or you need the encapsulation. |
| [route-animations.md](references/route-animations.md) | You animate a transition of a route with the API of the view transitions. |
| [angular-animations.md](references/angular-animations.md) | You animate an element that enters or leaves the DOM. |

### Configuration

| The file | Read it when |
| --- | --- |
| [environment-configuration.md](references/environment-configuration.md) | You configure the application at the build or at the runtime. |

## The neighbouring skills

- `frontend-design` holds the theme of Tailwind, the markup of the dashboard and the practice of Tailwind v4. Invoke it when you build a screen, and keep this skill for the structure.
- `frontend-unit-testing` holds every convention of a spec. This skill holds none.
