# Frontend Architecture

This document defines the **general architectural principles** of the frontend app (`apps/frontend`). It describes how the app is structured and *why*, so that every feature
stays consistent. For the step-by-step procedure to build or change a feature, use the `frontend-feature` skill.

## Overview

The frontend is a standalone **Angular** SPA (signals-based, zoneless-friendly) styled with **Tailwind CSS** (TailAdmin theme). It talks to the backend's REST API (`/api/v1`) and is organised as a set of **feature folders** with a layered structure — `domain` (types), `infrastructure/api` (data access), and `ui` (components) — plus a shared application shell (`layout`), route-level `pages`, and cross-feature `shared` code.

### Tech stack

| Technology                   | Role                                               |
|------------------------------|----------------------------------------------------|
| Angular (standalone)         | SPA framework                                      |
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
    containers/         — feature components: smart (inject the API repository) and shared forms
    components/         — purely presentational children (optional)
```

Using `projects` as the reference feature:

```
features/projects/
  domain/
    models/project.model.ts                    — Project (id: string, name: string)
    dtos/create-project.dto.ts                 — CreateProjectDto
    dtos/update-project.dto.ts                 — UpdateProjectDto
  infrastructure/
    api/projects-api.repository.ts             — ProjectsApiRepository
  ui/
    containers/projects-list/                  — ProjectsListComponent (smart)
    containers/project-form/                   — ProjectFormComponent (presentational, reused by add/edit)
```

Component files follow the `<name>.component.ts` / `<name>.component.html` convention.

### API data access (Infrastructure layer)

The infrastructure layer contains one `@Injectable()` repository per feature (`<feature>-api.repository.ts`) that owns all HTTP access. It combines two Angular APIs:

- **Reads → `httpResource`** (signal-based): reactive collections/records exposed as a resource with `isLoading()`, `error()`, `hasValue()`, `value()`, and `reload()`.
- **Commands & one-off reads → `HttpClient`**: `create`/`update`/`delete` (and `getById`) return `Observable`s the caller subscribes to.

After a successful command, the caller calls `.reload()` on the resource to refresh the list.

The repository is **not** `providedIn: 'root'`; it is `@Injectable()` and provided by the smart component or page that uses it (`providers: [ProjectsApiRepository]`), so each screen gets its own instance and a fresh fetch.

```typescript
@Injectable()
export class ProjectsApiRepository {
    private readonly http = inject(HttpClient);
    private readonly url = 'http://localhost:3000/api/v1/projects';

    // Reactive read
    public readonly projects = httpResource<Project[]>(() => this.url);

    // One-off read + commands
    public getById(id: string): Observable<Project> {
        return this.http.get<Project>(`${this.url}/${id}`);
    }
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

### Containers (UI layer)

Smart components provide and inject the API repository, expose its resource to the template, and issue commands. They live in `ui/containers/`.

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

    protected delete(id: string): void {
        this.repository.delete(id).subscribe(() => this.projects.reload());
    }
}
```

The template drives its own states off the resource: `@if (projects.isLoading())` / `@else if (projects.error())` / `@else if (projects.hasValue())`, with an empty-state branch.

### Presentational components (UI layer)

Purely presentational components use **signal inputs/outputs** (`input()`, `output()`), never inject services, and focus on rendering. They also live under `ui/containers/` alongside the smart components (or `ui/components/` for small children). The reusable **`ProjectFormComponent`** is the reference: it takes `initialName`/`submitting`/`submitLabel` inputs, seeds its editable field with `linkedSignal(() => this.initialName())`, and emits the trimmed value through a `save` output — leaving the actual create/update call to its parent page.

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
    components/         — Sidebar, header, backdrop, theme toggle, dropdowns
    containers/         — Layout component (wraps router-outlet)
    services/           — SidebarService, ThemeService
```

The `LayoutComponent` is the root route wrapper that renders the sidebar, header, and the routed page via `<router-outlet>`.

## Pages

Page components are the route-level components in `pages/`, nested per feature under `pages/<feature>/{list,add,edit}/`. Each is a `<name>.component.ts`, its class is suffixed `Page` (`ProjectsListPage`, `ProjectsAddPage`, `ProjectsEditPage`) and its selector `app-<feature>-<action>-page`.

Pages come in two shapes:

- **List page — thin composition.** It renders headings/actions and drops in the smart container; it holds no data logic.

  ```typescript
  @Component({ selector: 'app-projects-list-page', templateUrl: './projects-list.component.html', imports: [RouterLink, ProjectsListComponent] })
  export class ProjectsListPage {}
  ```

- **Add / edit pages — smart.** They `provide` and `inject` the API repository and the `Router`, orchestrate the command, and render the shared presentational form. Edit additionally reads the route param and pre-loads the record with `getById`.

  ```typescript
  @Component({ selector: 'app-projects-add-page', templateUrl: './project-add.component.html', providers: [ProjectsApiRepository], imports: [ProjectFormComponent] })
  export class ProjectsAddPage {
      private readonly repository = inject(ProjectsApiRepository);
      private readonly router = inject(Router);
      protected readonly submitting = signal(false);

      protected create(name: string): void {
          this.submitting.set(true);
          this.repository.create({ name }).subscribe({
              next: () => this.router.navigate(['/projects']),
              error: () => this.submitting.set(false),
          });
      }
  }
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
Page/Container → ProjectsApiRepository.create|update|delete (HttpClient) → HTTP → Backend → resource.reload() / router.navigate
```

Example — creating a project:

1. `ProjectFormComponent` emits the trimmed name via its `save` output.
2. `ProjectsAddPage.create(name)` calls `ProjectsApiRepository.create({ name })`.
3. On success it navigates back to `/projects`; the fresh `ProjectsListComponent` instance re-fetches. (An in-place delete instead calls `projects.reload()`.)

## Shared components

Reusable UI components are located in `shared/components/`.