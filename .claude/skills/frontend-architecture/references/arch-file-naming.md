# File naming of the frontend

All the frontend files must obey a naming convention. The conventions are as follows:

## Domain

- **Models**: `<entity>.model.ts`, where `entity` is the singular kebab-case name of the domain concept. Example: `project.model.ts`.

## Infrastructure

- **API repositories**: `<feature>-api.repository.ts`, where `feature` is the kebab-case name of the feature. Example: `projects-api.repository.ts`.

## UI

- **Presentational components**: `<name>.component.ts` and `<name>.component.html`, where `name` is always in kebab-case. A shared primitive keeps its own flat folder, `shared/components/<name>/<name>.component.{ts,html}`. If an import path of the file is wrong, correct the import; never rename the file to fix it.
