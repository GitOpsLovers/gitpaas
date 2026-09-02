# Stack

| Concern      | Tool                                                                                |
|--------------|-------------------------------------------------------------------------------------|
| Framework    | Angular 22, standalone components, `bootstrapApplication`                           |
| Data access  | `@angular/common/http` — `httpResource` (reads) + `HttpClient` (mutations)          |
| State        | Signals (`signal`, `computed`, `linkedSignal`, `input`/`output`)                    | 
| Styling      | Tailwind CSS 4, with the own theme of GitPaaS (`apps/frontend/src/styles.css`)     |
| UI libraries | `@lucide/angular`, `@ng-select/ng-select` (wrapped, never used directly by callers) |
| Testing      | Vitest (`*.spec.ts`)                                                                |
