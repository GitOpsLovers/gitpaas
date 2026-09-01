# Conventions

## Layering

The three layers of a feature obey one strict rule: **an outer layer can depend on an inner layer, but an inner layer can never depend on an outer layer.** `domain/` must not import `infrastructure/` or `ui/`.

- **All the business logic stays in the feature**, and never in a page. Each screen is a smart container that injects the repository, holds the state signals, and sends the commands.
- **A page is thin.** It puts the components together, has no logic, and injects no services. Almost all the page classes are empty.
- **The route parameters come in through the page.** With `withComponentInputBinding()`, a routed page receives the route parameters as signal inputs with the same names (`:id` → `id`, `:serviceId` → `serviceId`) and sends them to its container as inputs. The container reads them with `input.required<string>()` and does not inject `ActivatedRoute`. Thus the container is independent of the routing, and a test can set the inputs.
- **The guards and the interceptors stay in `ui/`**, and not in `infrastructure/`, because they are concerns of the UI pipeline. The browser persistence (localStorage or sessionStorage) is a data concern and stays in `infrastructure/storage/`.

## API repositories

Each feature has one `@Injectable()` repository (`<feature>-api.repository.ts`). This repository owns all the HTTP access and makes its endpoints from `environment.apiBaseUrl`. Obey the [Angular `httpResource` guide](https://angular.dev/guide/http/http-resource): **a read uses `httpResource`, and a mutation uses `HttpClient`.**

- **A read** is a resource with `isLoading()`, `error()`, `hasValue()`, `value()`, `status()` and `reload()`. A read with an id parameter is a factory that returns a resource with an accessor as its key (`projectById(() => id)`). The resource stays idle until the accessor gives a value.
- **A mutation** (`create`/`update`/`delete`) is a thin method that returns an `Observable` with one emission. A container uses it with `lastValueFrom` and `async`/`await`, and never with a manual `subscribe`. Then the container calls `.reload()` on the applicable read resource. A long-lived stream with many emissions (for example, an SSE log stream) is the exception: the method returns an `Observable`, and the container subscribes to it and cancels the subscription itself.

A feature repository is **not** `providedIn: 'root'`. The smart container gives it (`providers: [ProjectsApiRepository]`). Thus each screen gets a new instance and a new fetch. Only the app-wide session concerns, such as the authentication, have a root-provided repository.

Reference: [`projects-api.repository.ts`](../../../apps/frontend/src/app/features/projects/infrastructure/api/projects-api.repository.ts).

### The shape of the wire

A repository types its `httpResource` and its `HttpClient` calls with the shapes that `@gitpaas/contracts` exports. A feature declares no copy of a shape the wire already gives; a shape that lives on the client alone, and never crosses the wire, stays in `domain/models/`.

`httpResource` and `HttpClient` trust the declared generic and run no check of their own. A read that a wrong answer could silently corrupt must check the answer itself, and it uses the schema of the package to do it, never a cast.

## Containers

Each screen has one container. A list container reads a resource and controls the states in its own template (`@if (x.isLoading())` / `@else if (x.error())` / `@else if (x.hasValue())`, plus a branch for the empty condition). A command container owns a `submitting` signal, which it changes around the awaited call. It contains a presentational form, and it awaits the mutation in a `try/catch` block. If the mutation is successful, the container shows a toast and goes to a different route. A container that stays on the screen sets the flag again in `finally`. A container that goes to a different route can keep the flag set. A container can write to the `value` signal of a resource, to put a saved record into a detail view (`this.service.value.set(updated)`).

## Presentational components

A presentational component only shows data and emits events. It never injects a service. It uses **only signal inputs and signal outputs** (`input()`, `input.required()`, `output()`), and no `@Input()` decorators. A shared primitive also obeys these rules:

- **Do not use `CommonModule` or `ngClass`.** Make the dynamic classes with `[class]` bindings or with a `get …Classes()` accessor.
- **Extend the style with a `className` input**, which is added to the Tailwind classes of the component. Thus a caller can change the spacing and does not make a new component.
- Put a third-party widget behind the in-house contract (for example, the select control contains `@ng-select/ng-select`).
- **Use the per-icon components of `@lucide/angular`** (`<svg lucideX>`). Do not use the dynamic module.
- **Name an `output()` with a bare verb, and never with the name of a native DOM event** (`change`, `input`, `select`, `submit`, `close`, …). A template that binds `(close)` to such an output reads the native event of the host instead. Example: `start` and `cancel` broke this rule, so they became `begin` and `discard`.

The Tailwind design tokens (`brand-*`, `error-*`, `success-*`, …) are defined in the `@theme` block of the global stylesheet. They come from TailAdmin.

## State

New state uses signals.

## Path aliases

`apps/frontend/tsconfig.json` gives an absolute import prefix to each top-level area. The routes, the pages, the containers and the components use these prefixes.

| Alias             | Path                       |
|-------------------|----------------------------|
| `@features/*`     | `./src/app/features/*`     |
| `@layout/*`       | `./src/app/layout/*`       |
| `@pages/*`        | `./src/app/pages/*`        |
| `@shared/*`       | `./src/app/shared/*`       |
| `@environments/*` | `./src/environments/*`     |
