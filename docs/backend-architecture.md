# Backend architecture

This document details the architecture of the backend application (`apps/backend`), a REST API built with NestJS. 

## Overview

The general architectural principle on which this application is built is **hexagonal/clean architecture**, such that most of the business logic is agnostic to the backend framework itself; as a result, NestJS, TypeORM, and other technologies live only at the edges.

In addition, **vertical slicing** is implemented, so each business domain is encapsulated within its own feature (`src/features/`), thereby ensuring that the code reflects the organization’s structure.

## Stack

| Concern        | Tool                                          |
|----------------|-----------------------------------------------|
| Framework      | NestJS 11 with Express platform               |
| Persistence    | PostgreSQL via NestJS TypeORM                 |
| Live logs      | Redis                                         |
| Deploy engine  | `dockerode` and `dockerode-compose` over mTLS |
| Source access  | GitHub App via `@octokit/` library            |
| Auth           | Passport wirh local and JWT                   |
| Hardening      | `helmet`, `/throttler` and `class-validator`  |
| Testing        | Jest                                          |

## Structure

### The four layers

Each feature consists of four distinct layers, subject to a strict rule: **outer layers depend on inner, never the reverse.**

**Domain Layer**

This layer contains the models, interfaces, and repositories (ports), DTOs, errors, and all other elements that model the business. None of these elements have dependencies on other layers or rely on any specific technology, with the exception of the DTOs, which use `class-validator`.

**Application Layer**

This layer contains all business use cases, each in a specific file that adheres to the _single responsibility principle_. Use cases are pure functions that receive all necessary dependencies as parameters, so that they are only aware of elements in the domain layer.

**Infrastructure Layer**

This layer contains all implementations of the domain ports. This is where the specific technologies used by each interface or repository are defined, such as databases, GitHub access, etc.

**UI Layer**

This layer serves as the entry point to the application (HTTP routes), receiving requests via `controllers`, routing them to `services`, and where the `services` are responsible for invoking the use cases and declaring the necessary dependencies.

### Structure of a feature

As an example, here is the structure of the `projects` feature:

```text
features/projects/
  projects.module.ts
  domain/
    dtos/
      create-project.dto.ts                — DTO that defines a project's creation data
      upate-project.dto.ts                 — DTO that defines a project's update data
    models/
      project.model.ts                     — Project domain model
    repositories/
      projects.repository.ts               - Project persistence repository interface (port)
  application/                             — The layer where all business use cases reside
    create-project.use-case.ts
    get-all-projects.use-case.ts
    ...
  infrastructure/
    database/
      project-db.entity.ts                  — Database model for the project entity
      projects-db.repository.ts             — Concrete implementation of the persistence repository using a database
      projects-db.transformer.ts            — Transformer from the database layer to the domain model
  ui/
    controllers/                            - HTTP entry point
    services/                               - Business logic orchestration and dependency declaration
```

In general, all features must follow this organizational structure for entities, although each layer may contain more or fewer elements.

### Module wiring

Each feature declares its dependencies in its own module: `controllers`, `services`, `guards`, as well as specific infrastructure implementations, encapsulating the logic in a single location.

If any element needs to be used in other features (for example, repositories for accessing the database), the module declares them under the `exports.` key.

### Cross-cutting concerns

Some behaviours apply to the whole application, so they are configured once at the root rather than repeated on every endpoint.

- **Authentication** — A global JWT guard protects every route by default, so a request is authenticated unless it is explicitly marked otherwise. The `@Public()` decorator opts a route out.
- **Rate limiting** — Two named throttlers are read from the environment: `default` applies globally, and `stream` covers long-lived SSE connections. Individual endpoints tune this locally; for example, login restricts itself with `@Throttle` (5 requests per 60 seconds), while the log stream skips the `default` throttler with `@SkipThrottle` and applies `@Throttle` on `stream` instead.
- **Security headers** — `helmet()` sets secure HTTP headers at bootstrap.
- **Environment validation** — A `class-validator` schema validates every variable when the application boots and fails fast on anything missing or malformed. There are no silent fallbacks.
- **Error envelope** — A global exception filter returns a consistent shape, `{ statusCode, message, error, timestamp, path }`. It preserves the message arrays produced by the `ValidationPipe` and collapses unexpected errors into a generic 500. Server errors (5xx) log a full stack trace; client errors (4xx) log at warn level.

## Conventions

### Ports and dependency injection

Repositories and other collaborators follow the **port and adapter** pattern:

- **Port**: a plain `interface` (for example, `ProjectsRepository`) whose methods are declared as arrow-function properties in domain terms: they accept and return domain models and DTOs, never ORM or vendor types. Use cases depend only on this interface.
- **Adapter**: an `@Injectable()` class that `implements` the port (for example, `ProjectsDatabaseRepository`).
- **Wiring**: the module lists the **concrete class** in its `providers`, and consumers inject it **by class** (`@Inject(ProjectsDatabaseRepository)`, with `import type` for the port) while typing the dependency as the **port**. This avoids the `{ provide: TOKEN, useClass }` indirection.

### Transformers

No infrastructure repository returns raw ORM entities or vendor shapes. Mapping lives in a sibling `*.transformer.ts` file, named after the repository's file stem, whose plain exported functions convert a persistence or vendor shape into a domain model — `to<Model>(...)`, for example. The reverse direction is a separate function in the same file, and repositories call them where needed (`rows.map(toProject)`). This holds for every flavour of infrastructure.

### Persistence

- The root TypeORM connection is configured once, in `CoreModule` via `forRootAsync`; features only call `forFeature`, so there is no central list of entities.
- Entities are declared with `@Entity('<plural_snake_case>')`, their class names end in `DbEntity`, and they use UUID primary keys (`@PrimaryGeneratedColumn('uuid')`, exposed as `id: string` on the domain model). Custom column transformers convert non-native types at the persistence boundary.
- A **data-level foreign key** is a table relationship, independent of the direction of module dependency injection: the child owns the relation with `@ManyToOne(() => ParentDbEntity, { onDelete: 'CASCADE' })`. Two cascade chains exist — `project ◄ service ◄ deployment ◄ logs` and `refresh_token ► user`. The persisted deployment-queue table deliberately has **no** foreign key to its deployment, because the two have independent lifecycles.
- `synchronize` is enabled only when `NODE_ENV !== 'production'` (development and test); in production the schema is owned by versioned migrations.

### Validation

Write endpoints validate their input through DTO classes, enforced by the global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`, configured in `main.ts`). DTOs live in `domain/dtos/`, are the only domain files allowed to import a framework and to use the `!` assertion, and bind to requests through `@Body()`. Unknown properties are rejected, so the DTO is the authoritative input contract. Nested payloads are validated with `@ValidateNested({ each: true })` and `@Type(() => Dto)`, and optional fields are marked with `@IsOptional()`.

### HTTP and REST

The global route prefix is `api/v1`. The listen port comes from `getOrThrow('PORT')` with no hard-coded fallback, and CORS is credentialed and restricted to the allowlist parsed from the required `CORS_ORIGIN` variable. Controllers declare only their resource path (`@Controller('projects')`).

| Method & path | Notes                                               |
|---------------|-----------------------------------------------------|
| `GET /`       | list (optionally filtered via cleaned query params) |
| `GET /:id`    | 404 when missing                                    |
| `POST /`      | `@Body()` create DTO                                |
| `PUT /:id`    | `@Body()` update DTO; 404 when missing              |
| `DELETE /:id` | `@HttpCode(204)`; 404 when missing                  |

The `:id` segment binds with `@Param('id', ParseUUIDPipe)`. **Not-found is an HTTP concern**: repositories return `null` and `delete()` returns a `boolean`, and it is the controller that raises `NotFoundException`. The domain never throws HTTP exceptions — it raises domain errors that the UI edge translates.

### Naming and imports

- **Naming**: models are `<Entity>` in `models/<entity>.model.ts`; ports are `<Feature>Repository`; entities end in `DbEntity`; adapters end in `DatabaseRepository`; use cases are `<verb>-<entity>.use-case.ts` exporting `<verb><Entity>UseCase`; and tables are plural snake_case.
- **Path aliases**: defined in `tsconfig.json`, `@core/*` maps to `./src/core/*` and `@features/*` to `./src/features/*`. Use them for cross-feature and core imports, and relative paths within a feature.
- **JSDoc**: every export carries a one-line block, with fuller `@param` and `@returns` on repositories, services, and use cases. Mirror the existing style of the same file type.

## Key flows

### Request

Every request travels through the layers in the same order, from the HTTP edge inward to persistence and back:

```text
HTTP → ValidationPipe → Controller → Service → Use Case → Repository port ◄ adapter → PostgreSQL
```

### Durable queue (background work)

To trigger work without coupling the caller to when it runs, the producer enqueues a task and a consumer dequeues it later. The queue is another port and adapter: the domain declares a `DeploymentQueue` port, and the producing feature's infrastructure supplies the adapter and **exports** it. The queue is **durable and at-least-once** — tasks survive restarts, are retried on failure, and are dead-lettered once their attempts run out. The `deployments` feature is the reference: its adapter persists each task as a `deployment_queue_tasks` row and uses an internal RxJS `Subject` only as the in-process dispatch channel.

```text
queued ──(picked up)──► processing ──(ok)──► [row deleted]
   ▲                         │
   └──── retry (attempts<3) ─┤
                             └──(attempts exhausted)──► failed  (dead-letter;
                                                        deployment marked failed)
```

Each port operation maps onto that lifecycle: `enqueue` persists the task as `queued` with `attempts=0` and then emits it; `markProcessing` sets the task to `processing` and increments its attempt count; `markCompleted` deletes the row, since the deployment itself carries the durable outcome; `markFailed` records the error and re-enqueues the task while `attempts < 3`, otherwise dead-letters it **and** marks the deployment `failed` so it is never stranded in `pending`; and `recoverPending`, on restart, resets every `queued` or `processing` row back to `queued` and re-emits it.

`POST /deployments` validates the request, persists a `pending` record, enqueues a run task, and returns the record **with its id** immediately. `DeploymentRunnerService` (`OnModuleInit`) subscribes to the stream and only then calls `recoverPending()`. It serialises runs **per compose-project name** (`groupBy` + `concatMap`) while running distinct projects concurrently (`mergeMap`). Each run drives `runDeploymentUseCase`:

```text
markProcessing → fetch repo archive (providers) → docker executor up()
  (fans each output line to the logs write port `append`)
  → mark success/failed → logStore.complete(status) → markCompleted
```

The use case handles expected failures itself — a failed run becomes a persisted `failed` status — while an unexpected throw reaches `markFailed` as a last-resort safety net that triggers a retry or dead-lettering.

### Server-Sent Events (live streams)

Streaming a long-running result uses Server-Sent Events rather than the CRUD table. The handler is annotated with `@Sse(...)` and returns an `Observable` of messages, emitting one JSON-encoded event per value over a single long-lived response. It sits alongside the REST endpoints, which still serve durable history. The `logs` feature is the reference: it owns the durable `logs` table, the write port the runner appends to, `GET /logs/:deploymentId/stream` (a stream of SSE `LogEvent`s), and `GET /logs?deploymentId=` (the history).

The log-stream endpoint is **not** `@Public()`, so it requires a Bearer token. Because the native `EventSource` API cannot set headers, the frontend streams it with a token-capable SSE client.

### Authentication

The `authentication` feature wires JWT and Passport together and registers the global guard, so every route requires a valid access token by default; `@Public()`, a reflector-driven metadata flag, opts a route out. It exposes `POST /auth/login` (public, rate-limited), `POST /auth/refresh` (public, rotates tokens), `POST /auth/logout` (public, an idempotent revoke), and `GET /auth/me` (protected, with the password hash stripped). A `@CurrentUser()` parameter decorator surfaces the request's user.

- **Tokens**: on login, a local strategy validates the email and password; on every protected request, a JWT strategy validates the Bearer token, re-resolves the user, and **rejects deactivated accounts** (`isActive`) so a disabled user is locked out immediately. Access and refresh tokens use separate secrets and lifetimes (`JWT_ACCESS_*` and `JWT_REFRESH_*`), and passwords are hashed with argon2.
- **Rotation**: refresh tokens live in the `refresh_tokens` table (cascading with their user), stored only as a SHA-256 hash and keyed by a random `jti` carried in the token. Refreshing verifies the signature and expiry, looks the row up by `jti`, rejects it if it is missing, revoked, or expired, compares the hash, re-checks that the user is active, and then **revokes the old row and issues a fresh pair**. Rows are revoked, never deleted, so a replayed token is always rejected.

> RBAC is deferred. A `role` (`admin` or `user`) is persisted on each user, but no authorization guard consumes it yet.

### Docker-facing capabilities

- **Docker executor** (`deployments`): exposed as the `DockerExecutor` port with the `DockerodeDockerExecutor` adapter. Its `up(archive, composePath, projectName, onLog)` operation extracts the GitHub tarball, builds local `build:` services (streaming their output and rewriting them to image services), pulls registry images, brings the old stack `down()`, normalises healthcheck durations to nanoseconds (a dockerode-compose quirk), runs `up()`, and captures bounded per-container startup logs. All resources are grouped under a `com.docker.compose.project` name derived from a project-name slug.
- **Log store** (`logs`): exposed as the `LogStoreRepository` port (`append`, `complete`, `stream`, `purge`) with two adapters. `RedisLogStoreRepository` is the live buffer: it keeps a per-deployment list key (capped at roughly 5000 lines), a sequence counter, an events channel, and a 24-hour TTL, and its `stream()` replays the buffer, then tails pub/sub, dedupes by sequence, and completes on the terminal `end` event. `PersistentLogStoreRepository` is the adapter consumers actually inject: it buffers in memory, delegates live fan-out to Redis, and on `complete` persists the finished stream to the `logs` table before completing Redis.
- **Cleanup**: the database cascade removes `service → deployments → logs`, and Redis logs are purged when a deployment or a service is deleted. `deleteServiceUseCase` also tears down the Docker footprint through `ServiceFootprintRepository.remove(service)`, a best-effort step that force-removes labelled containers, compose networks, and images built as `${projectName}_*` while keeping shared pulled images.
- **Server**: `ServerPrunerRepository` prunes images, volumes, and stopped containers, while `OrphanContainersRepository` force-removes GitPaaS-labelled containers whose project matches no service. A daemon-unreachable error maps to `503`. `GET /server/readiness` is **public** and checks PostgreSQL, Redis, and the Docker daemon in parallel, each through a `HealthProbe` port; a throw counts as `down` and never rejects the aggregate. It returns `200` with a per-dependency breakdown when all are up, or `503` with the same breakdown otherwise.
- **Read-only**: `containers` and `networks` list a service's containers and compose networks by label; `providers` (a GitHub App) lists repositories and branches, resolves head commits, and fetches source archives. None of these touch the database.

## Operations

| Script                | Command                                                    |
|-----------------------|------------------------------------------------------------|
| `dev`                 | `nest start --watch`                                       |
| `build`               | `nest build`                                               |
| `start` / `start:prod`| `nest start` / `node dist/main`                            |
| `lint` / `test`       | `eslint .` / `jest` (plus `test:e2e`)                      |
| `migration:generate`  | ts-node TypeORM CLI against `src/.../data-source.ts`       |
| `migration:create`    | ts-node TypeORM CLI, empty migration                       |
| `migration:revert`    | reverts the last migration (source DataSource)             |
| `migration:run`       | `node` TypeORM CLI against the compiled `dist/` DataSource |

### Migrations

A single **connection-options factory**, built from `process.env`, is the shared source of truth. It sets `synchronize` to `NODE_ENV !== 'production'` and `migrationsRun` to `false` — production applies migrations through an explicit one-shot process, never at boot — and registers entities and migrations **by glob**, so no code enumerates them. The glob extension follows how the process runs: `.ts` under ts-node for the CLI, `.js` under `dist/` at runtime. Two consumers spread these options:

- `CoreModule` adds `autoLoadEntities: true` so that Nest also picks up entities registered through `forFeature`.
- The standalone `DataSource` (the factory's default export) is what the TypeORM CLI drives with `-d`; it omits `autoLoadEntities`, keeping the CLI independent of the DI container.

The current schema ships as a single **baseline migration** under `src/migrations/`, and every later schema change ships as a generated, versioned migration. The workflow after editing an entity is to generate the migration, review it, and commit it alongside the entity change.

## Related docs

For step-by-step instructions on adding a feature, use the `backend-feature` skill; to learn about the domain workflows, see [backend business](./backend-business.md).

- [Backend business](./backend-business.md) — domain workflows and rules
- [Frontend architecture](./frontend-architecture.md)
- [Infrastructure architecture](./infrastructure-architecture.md)
- [Monorepo architecture](./monorepo-architecture.md)
