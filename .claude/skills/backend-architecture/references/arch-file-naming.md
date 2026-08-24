# File naming of the backend

All the backend files must obey a naming convention. The conventions are as follows:

## Domain

- **Models**: `<name>.models.ts`, where `name` is always in kebab-case. Example: `user.models.ts`.
- **Ports**: `<name>.port.ts`, where `name` is always in kebab-case. Example: `container-runtime.port.ts`.
- **Repositories**: `<name>.repository.ts`, where `name` is always in kebab-case. Example: `users.repository.ts`.
- **DTOs**: `<verb>-<name>.dto.ts`, where `verb` gives the operation (`create`, `update`) and `name` is always in kebab-case. Example: `create-project.dto.ts`.
- **Errors**: `<name>.errors.ts`, where `name` is always in kebab-case and gives the feature or the entity the error classes belong to. Example: `project.errors.ts`.
- **Constants**: `<stem>.constants.ts`, where `stem` is always in kebab-case. Example: `gitpaas-labels.constants.ts`.

## Application

- **Use cases**: `<name>.use-case.ts`, where `name` gives the purpose of the use case. Example: `get-containers-by-service.use-case.ts`.

## Infrastructure

- **Adapters**: `<technology>-<name>.adapter.ts`, where `<name>` and `<technology>` are always in kebab case, and `<technology>` is the type of integration that the port uses. Example: `docker-container-runtime.adapter.ts`.
- **Repository implementations**: `<technology>-<name>.repository.ts`, where `<name>` and `<technology>` are always in kebab case, and `<technology>` is the type of integration that the repository uses. Example: `db-users.repository.ts`.
- **Database entities**: `db-<name>.entity.ts`, where `name` is always the singular kebab-case name of the entity. Example: `db-project.entity.ts`.
- **Transformers**: `<stem>.transformer.ts`, where `stem` names the persistence or vendor shape the file converts. Example: `db-projects.transformer.ts`.

## UI

- **Controllers**: `<name>.controller.ts`, where `name` is always in kebab-case and gives the resource. Example: `projects.controller.ts`.
- **Services**: `<name>.service.ts`, where `name` is always in kebab-case and gives the feature. Example: `projects.service.ts`.
- **Guards**: `<name>.guard.ts`, where `name` is always in kebab-case. Example: `roles.guard.ts`.
- **Decorators**: `<name>.decorator.ts`, where `name` is always in kebab-case. Example: `current-user.decorator.ts`.
