# File naming of the backend

All the backend files must obey a naming convention. The conventions are as follows:

## Domain

- **Models**: `<name>.models.ts`, where `name` is always in kebab-case. Example: `user.models.ts`.
- **Ports**: `<name>.port.ts`, where `name` is always in kebab-case. Example: `container-runtime.port.ts`.
- **Repositories**: `<name>.repository.ts`, where `name` is always in kebab-case. Example: `users.repository.ts`.
- **DTOs**: `<verb>-<name>.dto.ts`, where `verb` gives the operation (`create`, `update`) and `name` is always in kebab-case. Example: `create-project.dto.ts`.
- **Errors**: `<name>.errors.ts`, where `name` is always in kebab-case and gives the feature or the entity the error classes belong to. Example: `project.errors.ts`. `core/domain/errors/domain.error.ts` is the one exception, and it keeps the singular `error`, because it declares the one base `DomainError` class, and not a set of error classes.
- **Constants**: `<stem>.constants.ts`, where `stem` is always in kebab-case. Example: `gitpaas-labels.constants.ts`.

## Application

- **Use cases**: `<name>.use-case.ts`, where `name` gives the purpose of the use case. Example: `get-containers-by-service.use-case.ts`.

## Infrastructure

- **Adapters**: `<technology>-<name>.adapter.ts`, where `<name>` and `<technology>` are always in kebab case, and `<technology>` is the type of integration that the port uses. Example: `docker-container-runtime.adapter.ts`. A technology prefix names the concrete vendor or protocol the adapter wraps; when no technology names the adapter, it carries none. `secret-cipher.adapter.ts` (`core/infrastructure/crypto/`) and every `*-health-probe.adapter.ts` of `features/server/infrastructure/health/` are accepted with no technology prefix — their prefix names the target the adapter checks or ciphers, not a vendor.
- **Repository implementations**: `<technology>-<name>.repository.ts`, where `<name>` and `<technology>` are always in kebab case, and `<technology>` is the type of integration that the repository uses. Example: `db-users.repository.ts`. The file takes the `db-` prefix and the plural of the resource (`db-projects.repository.ts`), while its class takes the `Database` prefix, the singular domain concern, and the `Repository` suffix (`DatabaseProjectsRepository`); the two names do not mirror each other letter for letter.
- **Database entities**: `db-<name>.entity.ts`, where `name` is always the singular kebab-case name of the entity. Example: `db-project.entity.ts`.
- **Transformers**: `<stem>.transformer.ts`, where `stem` names the persistence or vendor shape the file converts. Example: `db-projects.transformer.ts`.
- **Strategies**: `<name>.strategy.ts`, where `name` is the Passport strategy in kebab-case. Example: `jwt.strategy.ts`.
- **Utils**: `<name>.util.ts`, where `name` gives the stateless helper's subject in kebab-case. Example: `docker-log.util.ts`.
- **Connections**: `<name>.connection.ts`, where `name` is the technology the file connects to. Example: `redis.connection.ts`.
- **Config**: `<stem>.config.ts`, where `stem` names the concern it configures. Example: `env-validation.config.ts`.

## UI

- **Controllers**: `<name>.controller.ts`, where `name` is always in kebab-case and gives the resource. Example: `projects.controller.ts`.
- **Services**: `<name>.service.ts`, where `name` is always in kebab-case and gives the feature. Example: `projects.service.ts`.
- **Guards**: `<name>.guard.ts`, where `name` is always in kebab-case. Example: `roles.guard.ts`.
- **Decorators**: `<name>.decorator.ts`, where `name` is always in kebab-case. Example: `current-user.decorator.ts`.
- **Jobs**: `<name>.job.ts`, where `name` gives the scheduled task in kebab-case. Example: `check-latest-release.job.ts`.
- **Pipes**: `<name>.pipe.ts`, where `name` is always in kebab-case. Example: `zod-validation.pipe.ts`.
- **Filters**: `<name>.filter.ts`, where `name` is always in kebab-case. Example: `all-exceptions.filter.ts`.
- **Middlewares**: `<name>.middleware.ts`, where `name` is always in kebab-case. Example: `request-id.middleware.ts`.
- **Translators**: `<name>.translator.ts`, where `name` names the shape it converts into an HTTP or a telemetry shape. Example: `http-error.translator.ts`.
- **Formatters**: `<name>.formatter.ts`, where `name` names the shape it renders into text. Example: `zod-issue.formatter.ts`.
- **Context**: `<name>.context.ts`, where `name` names the value the file carries across an async boundary. Example: `telemetry.context.ts`.
