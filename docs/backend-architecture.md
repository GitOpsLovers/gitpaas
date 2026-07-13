# Backend Architecture

This document defines the **general architectural principles** of the backend app (`apps/backend`). It describes how the app is structured and *why*, so that every feature
stays consistent. For the step-by-step procedure to build or change a feature, use the `backend-feature` skill.

## Overview

The backend is a **NestJS** application (Express platform) that exposes a REST API over a **PostgreSQL** database accessed through **TypeORM**. It is organised as a set of
**feature modules**, each following a **hexagonal / clean architecture** with a strict inward dependency rule. Domain and business logic are pure TypeScript with **zero framework dependencies**; NestJS and TypeORM live only at the edges.

### Tech stack

| Technology                 | Role                                           |
|----------------------------|------------------------------------------------|
| `@nestjs/common` / `core`  | Application framework                          |
| `@nestjs/platform-express` | HTTP platform (Express)                        |
| `@nestjs/config`           | Environment variable management                |
| `@nestjs/typeorm`          | TypeORM integration                            |
| `typeorm`                  | ORM                                            |
| `pg`                       | PostgreSQL driver                              |
| PostgreSQL                 | Database                                       |
| `class-validator`          | DTO validation (via global `ValidationPipe`)   |
| `class-transformer`        | Payload transformation                         |
| TypeScript                 | Language (strict-leaning config)               |

## Application bootstrap

`src/main.ts` is the single composition entry point. It applies three global, app-wide decisions that every feature relies on:

- **Global route prefix `api/v1`** (`app.setGlobalPrefix('api/v1')`). Controllers therefore declare only their resource path, never the version prefix.
- **CORS enabled** (`app.enableCors()`).
- **Global `ValidationPipe`** with `whitelist: true`, `forbidNonWhitelisted: true`, and `transform: true`. This is what makes DTO validation automatic and authoritative: unknown properties are stripped (and rejected), and payloads are transformed into DTO class instances. Validation is a platform guarantee, not something each controller re-implements.

The application listens on `process.env.PORT ?? 3000`.

## Module composition

```
AppModule
├── CoreModule
├── FeatureAModule
├── FeatureBModule
├── FeatureCModule
```

## The four layers

Every feature is split into four layers with a one-directional dependency rule: **outer layers depend on inner layers, never the reverse.**

```
    ui  ───────────►  application  ───────────►  domain
(controllers,         (use cases)            (models, ports, DTOs)
  services)                                        ▲
    │                                               │
    └────────►  infrastructure  ────────────────────┘
              (TypeORM entities, repository impls)
```

| Layer              | Location                          | Responsibility                                                                                                           | May import a framework? |
|--------------------|-----------------------------------|--------------------------------------------------------------------------------------------------------------------------|-------------------------|
| **domain**         | `domain/`                         | The contract: the **domain model** (entity interface), repository **ports**, and request **DTOs**.                       | No — except DTOs        |
| **application**    | `application/`                    | Business logic as **pure use-case functions** that receive the dependencies as parameters.                               | No.                     |
| **infrastructure** | `infrastructure/database/`        | **Adapters**: TypeORM entities and the repository implementation of the domain port, plus any entity→domain transformer. | Yes (TypeORM).          |
| **ui**             | `ui/controllers/`, `ui/services/` | HTTP routing and the NestJS DI **bridge** (services) that connect use cases to the repository implementation.            | Yes (NestJS).           |

**The core principle:** `domain` and `application` are pure, portable TypeScript. They know nothing about NestJS, TypeORM, HTTP, or PostgreSQL. The framework is an implementation detail confined to `infrastructure` and `ui`. This is what keeps use cases trivially testable (call the function with a fake repository) and the business rules independent of the delivery mechanism.

### Per-feature structure

```
features/<feature>/
  <feature>.module.ts                     — NestJS module wiring
  domain/
    models/<entity>.model.ts              — the domain model (entity interface); plus any app-specific input/filter types
    repositories/<feature>.repository.ts  — repository interface (the port), named <Feature>Repository
    dtos/                                 — create-/update- DTO classes (class-validator)
  application/                            — one <verb>-<entity>.use-case.ts per operation (pure functions)
  infrastructure/database/
    <entity>-db.entity.ts                 — TypeORM entity (…DbEntity)
    <feature>-db.repository.ts            — repository implementation (…DatabaseRepository), implements the port
    <feature>-db.transformer.ts           — entity→domain mapping (only when shapes differ)
  ui/
    controllers/<feature>.controller.ts
    services/<feature>.service.ts
```

Using `projects` as the reference feature:

```
features/projects/
  projects.module.ts
  domain/
    models/project.model.ts                — Project (id: string, name: string)
    repositories/projects.repository.ts    — ProjectsRepository (the port)
    dtos/create-project.dto.ts
    dtos/update-project.dto.ts
  application/
    get-all-projects.use-case.ts
    find-project-by-id.use-case.ts
    create-project.use-case.ts
    update-project.use-case.ts
    delete-project.use-case.ts
  infrastructure/database/
    project-db.entity.ts                   — ProjectDbEntity
    projects-db.repository.ts              — ProjectsDatabaseRepository
  ui/
    controllers/projects.controller.ts     — ProjectsController
    services/projects.service.ts           — ProjectsService
```

## The repository port & dependency injection

The repository is expressed as a **port** and an **adapter**, but wired without a custom provider token:

- **Port** — `domain/repositories/<feature>.repository.ts` exports a plain TypeScript `interface` named `<Feature>Repository` (e.g. `ProjectsRepository`). Methods are declared as arrow-function properties and are expressed in **domain terms**: they accept and return the domain model and the DTOs, never TypeORM types. This is what the pure use cases depend on.
- **Adapter** — `infrastructure/database/<feature>-db.repository.ts` exports `<Feature>DatabaseRepository`, an `@Injectable()` class that `implements <Feature>Repository`.
- **Wiring** — the feature module lists the concrete `<Feature>DatabaseRepository` **directly** in `providers`, and the service injects it **by class** (`@Inject(ProjectsDatabaseRepository)`). There is **no** `{ provide: TOKEN, useClass }` indirection. Because the adapter `implements` the port, the service can hand it to the use cases, which only ever see the port type — so the application layer stays framework-agnostic while DI stays simple.

```typescript
// projects.module.ts
@Module({
    imports: [TypeOrmModule.forFeature([ProjectDbEntity])],
    controllers: [ProjectsController],
    providers: [ProjectsService, ProjectsDatabaseRepository],
})
export class ProjectsModule {}
```

**DTOs flow through the whole write path.** Create/update use cases and repository methods receive the **DTO** itself (`create(createDto)`, `update(id, updateDto)`), not unpacked primitives. The service passes the validated DTO straight through from the controller to the use case to the repository.

## Persistence

- **ORM:** TypeORM with `@nestjs/typeorm`. The root connection is configured once in `CoreModule`; features only call `forFeature`.
- **Entities** (`infrastructure/database/<entity>-db.entity.ts`) define the table mapping with `@Entity('<plural_snake_case>')`. Class names end in `DbEntity`.
- **Primary keys are UUIDs:** `@PrimaryGeneratedColumn('uuid')`, and the domain model's `id` is a `string`.
- The adapter maps DTOs to rows with TypeORM helpers — `repository.create(createDto)` for inserts and `repository.merge(entity, updateDto)` for updates — so no transformer is needed while the entity, model, and DTO shapes align.

## Validation

All write endpoints validate input through **DTO classes** decorated with `class-validator`, enforced by the global `ValidationPipe`. DTOs:

- live in `domain/dtos/` and are the **only** domain files permitted to import a framework (`class-validator`);
- are **classes** (decorators require a class), with properties using the `!` definite-assignment assertion;
- are bound to controller handlers via `@Body()` — never an inline type or `Record<string, unknown>`.

Because the pipe runs `whitelist` + `forbidNonWhitelisted`, any property not declared on the DTO is rejected, so the DTO is the authoritative input contract.

Nested/array payloads use `@ValidateNested({ each: true })` + `class-transformer`'s `@Type(() => Dto)`; optional fields use `@IsOptional()`.

## HTTP & REST conventions

Each CRUD feature exposes the same REST shape:

| Method & path   | Handler              | Notes                                                |
|-----------------|----------------------|------------------------------------------------------|
| `GET /`         | `getAll` / `findAll` | List (optionally filtered via query params)          |
| `GET /:id`      | `findById`           | Throws `NotFoundException` when missing              |
| `POST /`        | `create`             | `@Body()` bound to a create DTO                      |
| `PUT /:id`      | `update`             | `@Body()` bound to an update DTO; 404 when missing   |
| `DELETE /:id`   | `delete`             | `@HttpCode(204)`; 404 when missing                   |

- Controllers declare only the resource path (`@Controller('projects')`) — the `api/v1` prefix is global.
- **Id params are UUIDs:** `:id` is validated and bound with `@Param('id', ParseUUIDPipe)`; a malformed id is rejected before the handler runs.
- **Delete semantics:** the repository's `delete(id)` returns a `boolean` (`(result.affected ?? 0) > 0`); the controller throws `NotFoundException` when it is `false`, otherwise returns `204 No Content`.
- **Not-found is an HTTP concern:** repositories return `null`; controllers translate that into `NotFoundException`. The domain layer never throws HTTP exceptions.
- Controllers clean `undefined` query params before passing a filter object to the service.

## Data flow

```
HTTP Request
  → ValidationPipe (validates/transforms DTO)
  → Controller (routing, query/param extraction, HTTP errors)
  → Service (NestJS DI bridge)
  → Use Case (pure business logic)
  → Repository interface  ◄── Repository implementation (TypeORM)
  → PostgreSQL
```

Example — `GET /api/v1/projects`:

1. `ProjectsController.getAll()` handles the request (this resource takes no filters).
2. `ProjectsService.getAll()` delegates to the use case.
3. `getAllProjectsUseCase(repository)` calls `repository.getAll()`.
4. `ProjectsDatabaseRepository.getAll()` runs a TypeORM `find()` ordered by `id DESC`.
5. Because `ProjectDbEntity` matches the `Project` domain model, entities are returned directly (no transformer).
6. The `Project[]` is JSON-serialized in the response.

Example — `POST /api/v1/projects` (DTO through the write path):

1. The global `ValidationPipe` validates the body into a `CreateProjectDto` instance.
2. `ProjectsController.create(createDto)` passes the DTO to `ProjectsService.create(createDto)`.
3. `createProjectUseCase(repository, createDto)` calls `repository.create(createDto)`.
4. `ProjectsDatabaseRepository.create()` builds the row with `repository.create(createDto)` and persists it with `save()`, returning the created `Project`.

A richer feature with filters would instead extract and clean query params in the controller, thread a filter object through the service and use case, build a TypeORM `where` in the repository, and map rows through a transformer.

## Path aliases

TypeScript path aliases (defined in `apps/backend/tsconfig.json`) keep cross-feature and core imports stable and absolute:

| Alias         | Path             |
|---------------|------------------|
| `@core/*`     | `./src/core/*`   |
| `@features/*` | `./src/features/*` |

Use them for cross-feature and core imports; use relative paths within a feature.

## Scripts

Defined in `apps/backend/package.json`:

| Script        | Command                              |
|---------------|--------------------------------------|
| `dev`         | `nest start --watch`                 |
| `build`       | `nest build`                         |
| `start`       | `nest start`                         |
| `start:debug` | `nest start --debug --watch`         |
| `start:prod`  | `node dist/main`                     |
| `lint`        | `eslint .`                           |
| `test`        | `jest`                               |
| `test:e2e`    | `jest --config ./test/jest-e2e.json` |

## Cross-cutting conventions

- **JSDoc** is applied consistently across the backend: a one-line block on every exported class/interface/function, and on domain repositories, services, and use cases a fuller block with `@param`/`@returns` (`Gets`/`Creates`/`Updates`/`Deletes …`). Mirror the existing style of the same file type when adding or changing code.
- **Naming:** domain models `<Entity>` in `models/<entity>.model.ts`; repository ports `<Feature>Repository` in `repositories/<feature>.repository.ts`; entities `…DbEntity`; repository impls `…DatabaseRepository`; use cases `<verb>-<entity>.use-case.ts` exporting `<verb><Entity>UseCase`; tables plural snake_case.