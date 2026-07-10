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

The server listens on `process.env.PORT ?? 3000`.

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
| **domain**         | `domain/`                         | The contract: repository **ports**, request **DTOs**, and any app-specific input/filter types.                           | No — except DTOs        |
| **application**    | `application/`                    | Business logic as **pure use-case functions** that receive their dependencies (the repository port) as parameters.       | No.                    |
| **infrastructure** | `infrastructure/database/`        | **Adapters**: TypeORM entities and the repository implementation of the domain port, plus any entity→domain transformer. | Yes (TypeORM).          |
| **ui**             | `ui/controllers/`, `ui/services/` | HTTP routing and the NestJS DI **bridge** (services) that connect use cases to the repository implementation.            | Yes (NestJS).           |

**The core principle:** `domain` and `application` are pure, portable TypeScript. They know nothing about NestJS, TypeORM, HTTP, or PostgreSQL. The framework is an implementation detail confined to `infrastructure` and `ui`. This is what keeps use cases trivially testable (call the function with a fake repository) and the business rules independent of the delivery mechanism.

### Per-feature structure

```
features/<feature>/
  <feature>.module.ts                     — NestJS module wiring
  domain/
    models/<feature>.models.ts            — ONLY app-specific input/filter types (optional; see below)
    repositories/<feature>.repository.ts  — repository interface (the port)
    dtos/                                 — create-/update- DTO classes (class-validator)
  application/                            — one <verb>-<entity>.use-case.ts per operation (pure functions)
  infrastructure/database/
    <entity>-db.entity.ts                 — TypeORM entity
    <feature>-db.repository.ts            — repository implementation (the adapter)
    <feature>-db.transformer.ts           — entity→domain mapping (only when shapes differ)
  ui/
    controllers/<feature>.controller.ts
    services/<feature>.service.ts
```

## Persistence

- **ORM:** TypeORM with `@nestjs/typeorm`. The root connection is configured once in `CoreModule`; features only call `forFeature`.
- **Entities** (`infrastructure/database/<entity>-db.entity.ts`) define the table mapping with `@Entity('<plural_snake_case>')`. Class names end in `DbEntity`.

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

- Controllers declare only the resource path (`@Controller('genres')`) — the `api/v1` prefix is global.
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

Example — `GET /api/v1/genres`:

1. `GenresController.getAll()` handles the request (this resource takes no filters).
2. `GenresService.getAll()` delegates to the use case.
3. `getAllGenresUseCase(repository)` calls `repository.getAll()`.
4. `GenresDatabaseRepository.getAll()` runs a TypeORM `find()` ordered by `id DESC`.
5. Because `GenreDbEntity` matches the `Genre` domain model, entities are returned directly (no transformer).
6. The `Genre[]` is JSON-serialized in the response.

A richer feature with filters would instead extract and clean query params in the controller, thread a filter object through the service and use case, build a TypeORM `where` in the repository, and map rows through a transformer.

## Cross-cutting conventions

- **Path aliases:** `@features/*` → `src/features/*`, `@core/*` → `src/core/*`. Use them for cross-feature and core imports; use relative paths within a feature.
- **JSDoc** is applied consistently across the backend: a one-line block on every exported class/interface/function, and on domain repositories, services, and use cases a fuller block with `@param`/`@returns` (`Gets`/`Creates`/`Updates`/`Deletes …`). Mirror the existing style of the same file type when adding or changing code.
- **Naming:** entities `…DbEntity`; repository impls `…DatabaseRepository`; use cases `<verb>-<entity>.use-case.ts` exporting `<verb><Entity>UseCase`; tables plural snake_case.