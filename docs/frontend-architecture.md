# Frontend Architecture

This document defines the **general architectural principles** of the frontend app (`apps/frontend`). It describes how the app is structured and *why*, so that every feature
stays consistent. For the step-by-step procedure to build or change a feature, use the `frontend-feature` skill.

## Overview

The frontend is an **Angular** SPA styled with **Tailwind CSS** (TailAdmin theme). It talks to the backend's REST API (`/api/v1`) and is organised as a set of **feature folders** with a layered structure — `domain` (types), `infrastructure/api` (data access), and `ui` (components) — plus a shared application shell (`layout`), route-level `pages`, and cross-feature `shared` code.

### Tech stack

| Technology                   | Role                                               |
|------------------------------|----------------------------------------------------|
| Angular.                     | SPA framework                                      |
| `@angular/common/http`       | Data access (`httpResource` + `HttpClient`)        |
| Signals                      | State (`signal`, `linkedSignal`, `input`/`output`) |
| Tailwind CSS                 | Styling (TailAdmin theme)                          |
| Vitest                       | Unit testing                                       |
| TypeScript                   | Language                                           |

## Module wiring

The application is bootstrapped in `main.ts` via `bootstrapApplication(App, appConfig)`. The `appConfig` in `app.config.ts` registers:

- `provideBrowserGlobalErrorListeners()` — global error handling
- `provideRouter(routes)` — route definitions
- `provideHttpClient()` — HTTP client for API calls

```
main.ts → bootstrapApplication(App, appConfig)
  app.config.ts
    ├── provideBrowserGlobalErrorListeners()
    ├── provideRouter(routes)
    └── provideHttpClient()
```

Routes are defined in `app.routes.ts` and use `LayoutComponent` as a parent wrapper with lazy child routes (`loadComponent`) for each page. A feature with sub-pages is grouped as a **nested `children` block** under the feature path:

```typescript
{
    path: 'projects',
    children: [
        { path: '', loadComponent: () => import('@pages/projects/list/projects-list.component').then((m) => m.ProjectsListPage), title: 'Projects | Artifactory' },
        { path: 'add', loadComponent: () => import('@pages/projects/add/project-add.component').then((m) => m.ProjectsAddPage), title: 'Add project | Artifactory' },
        { path: 'edit/:id', loadComponent: () => import('@pages/projects/edit/project-edit.component').then((m) => m.ProjectsEditPage), title: 'Edit project | Artifactory' },
    ],
}
```

## Path aliases

TypeScript path aliases (defined in `apps/frontend/tsconfig.json`) give each top-level area a stable, absolute import prefix — used throughout routes, pages, containers, and components:

| Alias         | Path                   |
|---------------|------------------------|
| `@features/*` | `./src/app/features/*` |
| `@layout/*`   | `./src/app/layout/*`   |
| `@pages/*`    | `./src/app/pages/*`    |
| `@shared/*`   | `./src/app/shared/*`   |

## Scripts

Defined in `apps/frontend/package.json`:

| Script  | Command                                        |
|---------|------------------------------------------------|
| `dev`   | `ng serve`                                     |
| `build` | `ng build`                                     |
| `watch` | `ng build --watch --configuration development` |
| `lint`  | `eslint .`                                     |
| `test`  | `ng test`                                      |

## Architecture per feature

Each feature follows a layered structure:

```
features/<feature>/
  domain/
    models/             — the domain model interface(s), e.g. <entity>.model.ts
    dtos/               — Create/Update DTO interfaces (request payloads)
  infrastructure/
    api/                — API data access (<feature>-api.repository.ts)
  ui/
    containers/         — smart components: inject and provide the API repository, own state, orchestrate commands
    components/         — purely presentational components (signal inputs/outputs, no injected services)
```

**All business logic lives in the feature**, never in pages. Every screen is a smart **container** that injects the repository, holds the state signals, and issues the create/update/delete/read commands. Presentational **components** only render and emit — a container wraps them.

### API data access (Infrastructure layer)

The infrastructure layer contains one `@Injectable()` repository per feature (`<feature>-api.repository.ts`) that owns all HTTP access, following the [Angular `httpResource` guide](https://angular.dev/guide/http/http-resource): **reads use `httpResource`, mutations use `HttpClient` directly**.

- **Reads → `httpResource`**: reactive collections/records exposed as a resource with `isLoading()`, `error()`, `hasValue()`, `value()`, `status()`, and `reload()`. A read parameterised by an id is a factory method returning a resource keyed off an accessor (`serviceById(() => id)`), idle until the accessor yields a value.
- **Mutations (POST/PUT/DELETE) → `HttpClient`**: `create`/`update`/`delete` are thin methods returning a single-emission `Observable`. Containers consume them with `lastValueFrom` and `async`/`await` (not manual `subscribe`). The guide explicitly recommends `HttpClient` over `httpResource` for mutations. After a successful mutation the caller calls `.reload()` on the relevant read resource to refresh it. Long-lived, multi-emission streams (e.g. an SSE/`EventSource` log stream) are the exception: those return an `Observable` the container `subscribe`s to and tears down explicitly.

```typescript
@Injectable()
export class ProjectsApiRepository {
    private readonly http = inject(HttpClient);
    private readonly url = 'http://localhost:3000/api/v1/projects';

    // Reactive reads
    public readonly projects = httpResource<Project[]>(() => this.url);
    public projectById(id: () => string | undefined) {
        return httpResource<Project>(() => {
            const projectId = id();

            return projectId ? `${this.url}/${projectId}` : undefined;
        });
    }

    // Mutations via HttpClient
    public create(dto: CreateProjectDto): Observable<Project> {
        return this.http.post<Project>(this.url, dto);
    }
    public update(id: string, dto: UpdateProjectDto): Observable<Project> {
        return this.http.put<Project>(`${this.url}/${id}`, dto);
    }
    public delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.url}/${id}`);
    }
}
```

The repository is **not** `providedIn: 'root'`; it is `@Injectable()` and provided by the smart **container** that uses it (`providers: [ProjectsApiRepository]`), so each screen gets its own instance and a fresh fetch.

### Containers (UI layer)

Smart components provide and inject the API repository, expose its read resources to the template, and issue mutations (awaited via `lastValueFrom`, with navigation/toasts on success). They live in `ui/containers/`. There is **one container per screen** — `projects-list` (read + delete), `project-add` (create), `project-edit` (load + update).

```typescript
@Component({
    selector: 'app-projects-list',
    providers: [ProjectsApiRepository],
    templateUrl: './projects-list.component.html',
    imports: [RouterLink],
})
export class ProjectsListComponent {
    private readonly repository = inject(ProjectsApiRepository);
    protected readonly projects = this.repository.projects;

    protected async delete(id: string): Promise<void> {
        try {
            await lastValueFrom(this.repository.delete(id));
            this.projects.reload();
        } catch {
            /* toast */
        }
    }
}
```

The list template drives its own states off the resource: `@if (projects.isLoading())` / `@else if (projects.error())` / `@else if (projects.hasValue())`, with an empty-state branch.

The command containers own a `submitting` signal (toggled around the awaited call), wrap the presentational form, and navigate on success. The mutation is awaited inside a `try/catch`: the success path shows a toast and navigates, and `submitting` is reset in `catch` — the success path deliberately leaves it set because the container navigates away. (A container that stays on screen after a mutation should reset the flag in a `finally` instead.) `project-add` creates; `project-edit` additionally reads the route param and pre-loads the record through a `projectById` read resource (deriving `initialName`/`loading` from it, rendering a loading branch until it resolves).

```typescript
@Component({
    selector: 'app-project-add',
    providers: [ProjectsApiRepository],
    templateUrl: './project-add.component.html',
    imports: [ProjectFormComponent],
})
export class ProjectAddComponent {
    private readonly repository = inject(ProjectsApiRepository);
    private readonly router = inject(Router);
    protected readonly submitting = signal(false);

    protected async create(name: string): Promise<void> {
        this.submitting.set(true);
        try {
            await lastValueFrom(this.repository.create({ name }));
            this.router.navigate(['/projects']);
        } catch {
            this.submitting.set(false);
        }
    }
}
```

Reads-that-feed-a-view (e.g. syncing a saved record back into a detail resource) can still write to a resource's `value` signal — for example `this.service.value.set(updated)` after a provider save.

### Presentational components (UI layer)

Purely presentational components use **signal inputs/outputs** (`input()`, `output()`), never inject services, and focus on rendering. They live under `ui/components/`. The reusable **`ProjectFormComponent`** is the reference: it takes `initialName`/`submitting`/`submitLabel` inputs, seeds its editable field with `linkedSignal(() => this.initialName())`, and emits the trimmed value through a `save` output — leaving the actual create/update call to its parent **container**.

```typescript
export class ProjectFormComponent {
    public readonly initialName = input('');
    public readonly submitting = input(false);
    public readonly submitLabel = input('Save');
    public readonly save = output<string>();

    protected readonly name = linkedSignal(() => this.initialName());
}
```

## Layout

The layout layer provides the application shell:

```
layout/
  ui/
    components/         — shell UI pieces (e.g. sidebar, header, breadcrumb)
    containers/         — the root layout container that wraps the router-outlet
    services/           — shell state services (e.g. sidebar, theme)
```

The `LayoutComponent` is the root route wrapper that renders the sidebar, header, and the routed page via `<router-outlet>`.

**`BreadcrumbComponent`** (`app-breadcrumb`) is the standard page header, ported from the TailAdmin theme. It takes a `pageTitle` signal input and renders the title plus a `Home › {{ pageTitle }}` trail. Every page places it as its first element.

## Pages

Page components are the route-level components in `pages/`, nested per feature under `pages/<feature>/{list,add,edit}/`. Each is a `<name>.component.ts`, its class is suffixed `Page` (`ProjectsListPage`, `ProjectsAddPage`, `ProjectsEditPage`) and its selector `app-<feature>-<action>-page`.

**Pages are thin — they only compose components; they hold no business logic and inject no services.** A page renders the `<app-breadcrumb>` header and drops in the feature's smart container. Most page classes are empty.

```typescript
@Component({
    selector: 'app-projects-add-page',
    templateUrl: './project-add.component.html',
    imports: [BreadcrumbComponent, ProjectAddComponent],
})
export class ProjectsAddPage {}
```

```html
<!-- project-add.component.html -->
<app-breadcrumb pageTitle="Add project" />
<app-project-add />
```

The state, repository, and command orchestration that used to live on the add/edit pages now live in their `project-add` / `project-edit` containers (see *Containers*).

**Route params enter through the page, not the container.** The router is configured with `withComponentInputBinding()`, so a routed page receives its route params as **signal inputs whose names match the params** (`:id` → `id`, `:serviceId` → `serviceId`). The page forwards them to its container as inputs — the container reads them via `input.required<string>()` rather than injecting `ActivatedRoute`. This keeps route-reading a page concern (still no service injection, no business logic) and leaves the container decoupled from routing and independently testable by setting inputs.

```typescript
// page: binds route params, forwards them
export class ServiceDetailPage {
    public readonly id = input.required<string>();          // :id (project)
    public readonly serviceId = input.required<string>();   // :serviceId
}
```

```html
<!-- service-detail.component.html (page) -->
<app-service-detail [projectId]="id()" [serviceId]="serviceId()" />
```

## Data flow

**Reads** (list):

```
Browser → Route → LayoutComponent → Page → Container → ProjectsApiRepository.projects (httpResource) → HTTP GET → Backend
```

Example — `GET /projects`:

1. User navigates to `/projects`.
2. `ProjectsListPage` renders `ProjectsListComponent`.
3. `ProjectsListComponent` reads `ProjectsApiRepository.projects` (the `httpResource`).
4. `httpResource` issues `GET http://localhost:3000/api/v1/projects`.
5. The template renders loading/error/value/empty states off the resource signals.

**Commands** (create/update/delete):

```
Container → ProjectsApiRepository.create|update|delete (HttpClient) → HTTP → Backend → resource.reload() / router.navigate
```

Example — creating a project:

1. `ProjectFormComponent` emits the trimmed name via its `save` output.
2. `ProjectAddComponent.create(name)` (the container) calls `ProjectsApiRepository.create({ name })`.
3. On success it navigates back to `/projects`; the fresh `ProjectsListComponent` instance re-fetches. (An in-place delete instead calls `projects.reload()`.)

## Shared components

Cross-feature, reusable UI primitives live in `shared/components/<name>/<name>.component.{ts,html}` (one flat folder per component, no grouping subfolders). They are ported from the TailAdmin theme and follow a common contract:

- **Selector** `app-<name>`; class `…Component`.
- **Signal inputs only** — `input()` for optional, `input.required()` for mandatory. No `@Input()` decorators. Event outputs are emitted via outputs.
- **No `CommonModule`/`ngClass`.** Dynamic classes are built with `[class]` bindings (or a `get …Classes()` accessor) and string interpolation, keeping the imports minimal.
- **Style extension via a `className` input**, appended to the component's own Tailwind classes so callers can tweak width/spacing without forking the component.

For example, `ButtonComponent` (`app-button`) exposes `variant`/`size`/`disabled` signal inputs and builds its class string from `get …Classes()` accessors, while a titled card wraps arbitrary content through `<ng-content>`.

The Tailwind design tokens these rely on (`brand-*`, `error-*`, `success-*`, …) are defined in the `@theme` block of the app's global stylesheet, ported from TailAdmin.