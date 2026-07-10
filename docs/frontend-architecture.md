# Frontend Architecture

This document defines the **general architectural principles** of the frontend app (`apps/frontend`). It describes how the app is structured and *why*, so that every feature
stays consistent. For the step-by-step procedure to build or change a feature, use the `frontend-feature` skill.

## Overview

The backend is a **NestJS** application (Express platform) that exposes a REST API over a **PostgreSQL** database accessed through **TypeORM**. It is organised as a set of
**feature modules**, each following a **hexagonal / clean architecture** with a strict inward dependency rule. Domain and business logic are pure TypeScript with **zero framework dependencies**; NestJS and TypeORM live only at the edges.

### Tech stack

| Technology                   | Role 
|------------------------------|------------------------------|
| Angular                      | SPA framework                |
| `@angular/common/http`       | HTTP client (`httpResource`) |
| Vitest                       | Unit testing                 |
| TypeScript                   | Language                     |

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

Routes are defined in `app.routes.ts` and use `LayoutComponent` as a parent wrapper with child routes for each page.

## Architecture per feature

Each feature follows a layered structure:

```
features/<feature>/
  domain/
    dtos/               — Create/Update DTO interfaces (request payloads)
    models/             — App-specific types ONLY (optional; the shared entity is imported from the package)
  infrastructure/
    api/                — API data access (Angular services with httpResource)
  ui/
    containers/         — Smart components (inject API services, manage state)
    components/         — Presentational components (inputs, outputs)
```

### API data access (Infrastructure layer)

The infrastructure layer contains Angular injectable services that communicate with the backend API using Angular's `httpResource` (signal-based HTTP). These services are located in `infrastructure/api/`.

```typescript
@Injectable()
export class GenresApiRepository {
    private readonly url = 'http://localhost:3000/api/v1/genres';
    public genres = httpResource<Genre[]>(() => this.url);
}
```

### Containers (UI layer)

Container components (smart components) inject API services and expose data to child components. They handle state management and user interactions. Located in `ui/containers/`.

```typescript
@Component({
    selector: 'app-genres-list',
    providers: [GenresApiRepository],
    templateUrl: './genres-list.component.html',
})
export class GenresListComponent {
    private readonly repository = inject(GenresApiRepository);
    public genres: HttpResourceRef<Genre[] | undefined> = this.repository.genres;
}
```

### Components (UI layer)

Presentational components receive data via `@Input()` and emit events via `@Output()`. They focus purely on rendering. Located in `ui/components/`.

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

Page components are route-level components that compose layout elements with feature containers. Located in `pages/`.

Pages may be nested for sub-routes (e.g. `pages/genres/list/`, `pages/genres/add/`, and `pages/genres/edit/`).

Example pattern:

```html
<app-page-breadcrumb pageTitle="Genres" />
<div class="space-y-6">
    <div>
        <app-component-card title="Available genres" [action]="{ url: '/genres/add', name: 'Add' }">
            <app-genres-list></app-genres-list>
        </app-component-card>
    </div>
</div>
```

## Data flow

```
Browser → Route → LayoutComponent → PageComponent → Container → API Service → HTTP → Backend
```

Example: `GET /genres`:

1. User navigates to `/genres`
2. `GenresListPageComponent` renders `GenresListComponent`
3. `GenresListComponent` reads from `GenresApiRepository.genres` (httpResource signal)
4. `httpResource` issues a GET request to `http://localhost:3000/api/v1/genres`
5. Response is stored in the signal and rendered in the template
6. Template handles loading/error/value states via `@if (genres.isLoading())`, `@else if (genres.error())`, `@else if (genres.hasValue())`

## Shared components

Reusable UI components are located in `shared/components/`.