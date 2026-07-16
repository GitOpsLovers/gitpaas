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

### Two independent axes: data-level FK vs module DI

Feature modules keep their imports pointed **one way** to avoid circular module dependencies. But two distinct relationships are at play, and they are **independent axes** that need not point the same direction:

- **Data-level FK** — expressed purely in TypeORM: a child row owns a foreign key to its parent (`@ManyToOne(() => ParentDbEntity, { onDelete: 'CASCADE' })`). This is a *table* relationship and requires **no module import**.
- **Module DI** — which feature module imports and injects from which, i.e. which feature *depends* on another at wiring time.

For most features the two align: a child owns the FK **and** its module imports the parent to reuse its repository. That gives the chain:

```
project ◄── service ◄── deployment          (data FK, and module DI, both child → parent)
```

Read it as "service depends on project, deployment depends on service". Each step uses the same parent-FK + cascade pattern (`service → project`, `deployment → service`).

**The two axes can diverge**, and `logs` is the case where they do. The `logs` table still owns a `deploymentId` foreign key (`@ManyToOne` → deployment, cascade) — exactly like `service → project` — so the *data-level* "a log belongs to a deployment" relationship is preserved. But `logs` is a **leaf output feature**: it only records and streams log output and exposes a write port for that. Deployment is what *produces* the output, so at the module level **`deployments` imports `logs`** to inject that write port. The result:

```
data-level FK :  logs ──────► deployment      (a log row belongs to a deployment)
module DI     :  deployments ──────► logs      (deployment injects the logs write port)
```

Because `logs` imports no other feature module, it introduces no cycle. When a feature must *trigger* work without inverting an import, the two are decoupled through a **queue owned by the producing feature** rather than a direct import — see [Cross-feature collaboration](#cross-feature-collaboration).

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
| **infrastructure** | `infrastructure/database/`        | **Adapters**: TypeORM entities and the repository implementation of the domain port, plus the transformer that maps persistence/external shapes to domain models. | Yes (TypeORM).          |
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
    <feature>-db.transformer.ts           — persistence↔domain mapping functions (always present)
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
    projects-db.transformer.ts             — toProject (entity → domain)
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
- The adapter maps DTOs to rows with TypeORM helpers — `repository.create(createDto)` for inserts and `repository.merge(entity, updateDto)` for updates.

### Transformers: infra always returns domain models

Every infrastructure repository returns **domain models** — never raw ORM entities, persistence records, or external-API shapes. The mapping lives in a **transformer**, following a strict convention:

- **Plain exported functions**, not classes, static methods, or NestJS providers. They are named `to<Model>(...)` — e.g. `toProject(...)`, `toService(...)`, `toContainer(...)`.
- They live in a **sibling file next to the repository, in the same directory**, named after the repository's file stem: `<stem>.transformer.ts`. So `projects-db.repository.ts` pairs with `projects-db.transformer.ts`, and a `*.provider.ts` adapter pairs with `<stem>.transformer.ts` likewise.
- The primary direction maps **persistence/external representation → domain model**. When a repository also needs the reverse for writes (domain model → persistence rows), that direction lives as **another function in the same transformer file**.
- Repositories **import and call** these functions instead of returning raw entities or doing inline mapping (e.g. `projects.map(toProject)`).

This holds across every infra flavour — TypeORM database repositories, dockerode adapters, external GitHub-API providers, Redis, and the log store — so the domain layer never sees a persistence or vendor shape regardless of the backing technology.

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
5. The loaded entities are mapped to domain models through the transformer (`projects.map(toProject)`); the repository never returns raw `ProjectDbEntity` rows.
6. The `Project[]` is JSON-serialized in the response.

Example — `POST /api/v1/projects` (DTO through the write path):

1. The global `ValidationPipe` validates the body into a `CreateProjectDto` instance.
2. `ProjectsController.create(createDto)` passes the DTO to `ProjectsService.create(createDto)`.
3. `createProjectUseCase(repository, createDto)` calls `repository.create(createDto)`.
4. `ProjectsDatabaseRepository.create()` builds the row with `repository.create(createDto)` and persists it with `save()`.

A richer feature with filters would instead extract and clean query params in the controller, thread a filter object through the service and use case, build a TypeORM `where` in the repository, and map rows through the transformer.

## Cross-feature collaboration

Most features talk to their neighbour by importing it (following the one-way module DI direction of the [two axes](#two-independent-axes-data-level-fk-vs-module-di)). Two patterns handle the cases that the plain CRUD-over-import shape does not: a **queue** for decoupling a synchronous HTTP response from background work, and **Server-Sent Events** for streaming a live result back to the client.

### The queue decoupling pattern

Sometimes work must be *triggered* on one seam but *performed* on another — either to avoid inverting an import, or, as here, to let a synchronous request return immediately while the real work runs in the background. The rule of thumb:

> To kick off work without coupling the caller to when or how it runs, enqueue a task on a **dependency-free queue** and let a consumer dequeue it. The queue is owned and exported by the feature that produces the task, so any collaborator already depending on that feature can inject it without adding a new dependency or a cycle.

The queue is expressed as a **port and an adapter**, exactly like the [repository pattern](#the-repository-port--dependency-injection). The domain declares a technology-agnostic port — an interface (`DeploymentQueue`) exposing an enqueue method, `enqueue(task)` — so the application layer depends only on the contract. The **producing feature's** infrastructure supplies the adapter: a small `@Injectable()` that `implements` the port by wrapping an RxJS `Subject` (`RxjsDeploymentQueue`), adding the `dequeued$` stream that consumers dequeue from. As with repositories, the concrete adapter is the injection token and consumers type the dependency as the port (`@Inject(RxjsDeploymentQueue) private readonly queue: DeploymentQueue`), so DI stays simple while the domain stays framework-free. The adapter is provided and exported by that feature's module. The producer only knows "I asked for this to happen"; it never learns when the work finishes or how it is done. This dependency-free `Subject`-backed seam is the reusable part of the pattern.

The **deployments** feature is the reference example, and here the queue decouples the **synchronous `POST` response from the background run — entirely within the same feature**. `POST /api/v1/deployments` validates, persists the deployment record, enqueues a run task on the `DeploymentQueue`, and returns the created deployment (with its **id**) *immediately*. A background runner in the **same** deployments feature — a service implementing `OnModuleInit` that dequeues from the queue — then drives the actual run out of band:

```
deployments feature
──────────────────────────────────────────────────────────────────────
POST /deployments (request path)          background runner (OnModuleInit)
  validate + persist record                 dequeues dequeued$, and per
  queue.enqueue({...})   ──► DeploymentQueue ──► task drives the run:
  return deployment (id) ↩ now              (RxJS Subject)   mark running
                                                             → fetch repo archive
                                                             → docker executor
                                                             → append lines to the
                                                               logs write port
                                                             → mark success / failed
                                                             → complete the log stream
```

The runner marks the deployment running, fetches the source archive, runs the Docker executor, and marks the deployment `success`/`failed`. It never persists log output itself: it fans each captured line to the **logs write port** (`append`) and, at the end, `complete`s the stream with the terminal status. How those lines are buffered and stored is entirely a logs-feature concern hidden behind that port. The runner's own error handling (plus a last-resort guard in the subscriber) means a failed run becomes a persisted failed status rather than an unhandled throw. Because the run is fire-and-forget off the queue, the caller gets its id back without waiting for Docker.

### Server-Sent Events for live streams

Streaming a long-running result to the client uses **Server-Sent Events (SSE)**, not the CRUD table. A controller handler is annotated `@Sse(...)` and returns an `Observable` of messages; each emission is serialised (e.g. one JSON-encoded event per message) and pushed to the browser over a single long-lived HTTP response. This is a delivery mechanism layered *alongside* the standard REST shape, not a replacement — the same resource still exposes its normal list/read endpoints for durable history.

The **logs** feature is the reference example. It is a **leaf output feature**: it records and streams a deployment's log output and nothing else. It owns both the live stream and the durable `logs` table, and exposes the write port the deployments runner appends to. The same port's read side backs `GET /api/v1/logs/:deploymentId/stream`: it replays the buffered output, then live lines, and completes when the run's terminal event arrives. On completion the finished stream is persisted to the `logs` table — log-table persistence is entirely internal to logs — and its durable history is then read through the ordinary list endpoint (`GET /api/v1/logs?deploymentId=...`). The live buffer/fan-out lives behind that domain port whose adapter is backed by Redis, so the streaming transport stays an infrastructure detail.

**Client flow.** The two seams compose from the browser's point of view: a client `POST`s a deployment, gets the **id** back immediately, then opens the log stream at `GET /api/v1/logs/:deploymentId/stream` with that id. The background runner drives the run meanwhile, so the stream fills in live while the request has long since returned.

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

## Cross-cutting core services

`CoreModule` is `@Global()`, so anything it provides and exports is injectable everywhere without a feature having to import another feature. This is the home for **shared, dependency-free services** that many features need — placing them here (rather than inside the feature that first needed them) keeps them reachable from anywhere without risking a circular module dependency.

- **Diagnostic logging.** Features log through a shared `DiagnosticLoggerService` — a thin wrapper over the NestJS `Logger` — injected from core, instead of instantiating their own `Logger`. Centralising it keeps logging consistent and lets the wrapper evolve (formatting, transports) in one place.
- **The shared Docker/Redis clients** are provided the same way. (The deployment queue is *not* a core service — it is owned and exported by the feature that produces run tasks; see [Cross-feature collaboration](#the-queue-decoupling-pattern).)

## Cross-cutting conventions

- **JSDoc** is applied consistently across the backend: a one-line block on every exported class/interface/function, and on domain repositories, services, and use cases a fuller block with `@param`/`@returns` (`Gets`/`Creates`/`Updates`/`Deletes …`). Mirror the existing style of the same file type when adding or changing code.
- **Naming:** domain models `<Entity>` in `models/<entity>.model.ts`; repository ports `<Feature>Repository` in `repositories/<feature>.repository.ts`; entities `…DbEntity`; repository impls `…DatabaseRepository`; use cases `<verb>-<entity>.use-case.ts` exporting `<verb><Entity>UseCase`; tables plural snake_case.

## Business logic

The following document describes all the business flows of the backend application: [backend-business.md](docs/backend-business.md)