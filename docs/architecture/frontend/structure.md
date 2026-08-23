# Structure

## Bootstrap and routing

`main.ts` calls `bootstrapApplication(App, appConfig)`. `app.config.ts` registers:

```text
provideBrowserGlobalErrorListeners()
provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling(…))
provideHttpClient(withInterceptors([authInterceptor]))
```

The root `App` is only a thin host. Its template is `<router-outlet /><app-toast />`. Thus the global toast overlay shows above each route. It injects `ThemeService` (which applies the stored theme at startup) and `Title`.

`app.routes.ts` gives **two tiers**. The first tier is a public `signin` route that `guestGuard` protects, and which sends an authenticated user to the dashboard. The second tier is the root `''` shell route that `authGuard` protects. This route loads `LayoutComponent` and loads each in-app page lazily as a child. A path that agrees with no route goes to the dashboard. The lazy children use `loadComponent`. If a feature has sub-pages, they are a nested `children` block below the path of the feature, and a deeper resource has more levels (for example, the services are below `projects/:id/services/…`, with a detail route with tabs and a redirect to a default tab). Each route sets a `title`.

## Per-feature layout

The three layers are always there in some form. A sub-folder is there only if the feature needs it. A simple feature has only `domain/models/` and `infrastructure/api/`. A large feature (for example, `authentication`) uses all the slots.

```text
features/<feature>/
  domain/
    models/         — domain model interfaces, <entity>.model.ts
  infrastructure/
    api/            — API data access, <feature>-api.repository.ts
    storage/        — browser persistence (e.g. token storage)
  ui/
    containers/     — smart components: provide/inject the repository, own state, issue commands
    components/     — purely presentational (signal inputs/outputs, no injected services)
    guards/         — functional route guards (CanActivateFn)
    interceptors/   — functional HTTP interceptors (HttpInterceptorFn)
    services/       — root-provided services owning cross-screen feature state
```

Not all the features have a page. Some features give only components and a repository, which **a container of a different feature uses** on the screen of that other feature. For example, the service-detail screen uses child components and repositories from adjacent features, and these features have no route of their own. Other features have only models. Thus a feature gives the slots that it needs, and the screens are made by composition.

The `projects` feature is the reference example of this shape: a `Project` model, a `ProjectsApiRepository`, and its `list`/`add`/`edit`/`detail` containers and components. The `namespaces` feature repeats the same shape one level above it, because a namespace groups projects: it has a `Namespace` model, a `NamespacesApiRepository`, and its own `list`/`add`/`edit` containers and components. The routes show this grouping too — the project routes nest below the namespace route (`namespaces/:namespaceId/projects/…`), the same way the service routes nest below the project route.

## Layout and pages

`layout/ui/{components,containers,services}/` holds the application shell. `LayoutComponent` is the wrapper of the root route. It shows the sidebar, the header and `<router-outlet>`. The header injects `AuthService` for the user menu and for the logout. `BreadcrumbComponent` (`app-breadcrumb`) is the standard page header. It takes a `pageTitle` signal input and shows a `Home › {{ pageTitle }}` trail. Each page puts it first.

`pages/` holds the route-level components, in a folder for each feature (`pages/<feature>/{list,add,edit,detail}/`). The class names end with `Page`, and the selectors are `app-<feature>-<action>-page`.

## Shared

```text
shared/
  components/   — reusable presentational primitives (one flat folder per component)
  services/     — cross-cutting root-provided services (e.g. the toast stack)
  pipes/        — reusable template pipes (e.g. safe-html for trusted markup)
```

The toast system is the reference cross-cutting service. `ToastService` (`providedIn: 'root'`) owns a stack that signals control, with typed `success`/`error`/`warning`/`info` helpers and an automatic dismissal. The presentational `ToastComponent` shows the stack. It is mounted one time, globally, in `App`.
