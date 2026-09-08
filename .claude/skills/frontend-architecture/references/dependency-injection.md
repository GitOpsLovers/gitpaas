# Dependency injection

Dependency injection (DI) shares code across the application. A class asks the DI system for a
dependency, and the DI system gives an instance. This project injects the concrete class of a
collaborator, and never an `InjectionToken`.

## Services

A service is a TypeScript class decorated with `@Injectable()`.

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class ProjectsApiRepository {
  private readonly http = inject(HttpClient);
}
```

- `@Injectable({ providedIn: 'root' })` makes the service a singleton for the whole application,
  and tree-shakes it out of the bundle when nothing injects it. Use it for an app-wide session
  concern, such as the authentication.
- A service with no `providedIn` needs a `providers` array (a `@Component({ providers: [...] })`,
  or a route). A feature repository takes this form: the smart container gives it, so each screen
  gets a new instance and a new fetch.

## The `inject()` function

Use `inject()` to request a dependency, as a field initializer or in a constructor.

```ts
@Component({ selector: 'app-navbar' })
export class NavbarComponent {
  private readonly router = inject(Router);
}
```

### The injection context

`inject()` works only inside an **injection context**:

1. A field initializer or a constructor of a class that DI instantiates (`@Injectable`,
   `@Component`, `@Directive`, `@Pipe`).
2. A factory function of a provider (`useFactory`).
3. A functional API that Angular runs (a functional route guard, an interceptor).

A call outside these places throws. Use `runInInjectionContext` to run a function inside an
injection context you hold as an `Injector` or an `EnvironmentInjector`:

```ts
private readonly injector = inject(EnvironmentInjector);

reloadAfterNavigation(): void {
  runInInjectionContext(this.injector, () => {
    const router = inject(Router);
  });
}
```

## The hierarchy of the injectors

1. **`EnvironmentInjector`**: the root injector, and one per lazy-loaded route. Configured with
   `providedIn: 'root'` or with `ApplicationConfig.providers` at the bootstrap.
2. **`ElementInjector`**: one per DOM element, configured with the `providers` or the
   `viewProviders` array of a `@Component()` or a `@Directive()`.

A request climbs the `ElementInjector` tree first, then the `EnvironmentInjector` tree, and throws
when nothing answers.

- **`optional`**: return `null` instead of throwing.
- **`skipSelf`**: start the search at the parent `ElementInjector`.
- **`viewProviders`**: give the service to the component and its view, and not to the content that
  a caller projects with `<ng-content>`. Use `providers` to give it to the projected content too.

## Manual providers

The `providers` array of a `@Component()` accepts a shorthand, or an object:

```ts
providers: [
  ProjectsApiRepository, // shorthand for { provide: ProjectsApiRepository, useClass: ProjectsApiRepository }
  { provide: Logger, useClass: BetterLogger },
  { provide: ApiClient, useFactory: () => new ApiClient(inject(HttpClient)) },
],
```
