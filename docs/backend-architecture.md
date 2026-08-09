# Backend architecture

This document gives the architecture of the backend application (`apps/backend`). The backend is a REST API made with NestJS.

## Overview

The application obeys the rules of the **hexagonal/clean architecture**. Thus almost all the business logic is independent of the backend framework. NestJS, TypeORM and the other technologies stay at the edges of the application.

The application also uses **vertical slicing**. Each business domain stays in its own feature (`src/features/`). Thus the code shows the structure of the organization.

---

## Stack

| Concern        | Tool                                                             |
|----------------|------------------------------------------------------------------|
| Framework      | NestJS 11 with Express platform                                  |
| Persistence    | PostgreSQL via NestJS TypeORM                                    |
| Live logs      | PostgreSQL-backed store with in-process RxJS fan-out over SSE    |
| Deploy engine  | `dockerode` and `dockerode-compose` over the local Docker socket |
| Source access  | GitHub App via `@octokit/` library                               |
| Auth           | Passport with local and JWT                                      |
| Hardening      | `helmet`, `/throttler` and `class-validator`                     |
| Testing        | Jest                                                             |

---

## Structure

### Top-level source folders

`src/` has three folders at the same level. To find the correct folder for a file, think about **who needs the file**, not about what the file does:

```text
src/
  core/
  features/
  shared/
```

- **`core/`** holds only the **structural elements that make the application operate**: the configuration and the environment validation, the database connection, the container runtime, the global exception filter and the diagnostic logging.
- **`features/`** is the default location. If an element is part of one business domain, it stays in the feature of that domain and in no other place.
- **`shared/`** holds **the reusable functions that are not structural and that are not part of one domain**:.

### The four layers

Each feature has four different layers. There is one strict rule: **an outer layer can depend on an inner layer, but an inner layer can never depend on an outer layer.**

**Domain Layer**

This layer holds the models, the repository interfaces and the port interfaces, the DTOs, the errors and all the other elements that give the business model. These elements do not depend on the other layers and do not use a specified technology. The DTOs are the only exception, because they use `class-validator`.

**Application Layer**

This layer holds all the business use cases. Each use case has its own file and obeys the _single responsibility principle_. A use case is a pure function that receives all its dependencies as parameters. Thus a use case knows only the elements of the domain layer.

**Infrastructure Layer**

This layer holds all the implementations of the domain ports. Each interface or repository gets its technology here, for example a database or the access to GitHub.

**UI Layer**

This layer is the entry point of the application (the HTTP routes). The `controllers` receive the requests and send them to the `services`. The `services` call the use cases and declare the necessary dependencies.

### Structure of a feature

All the features have the same layout. The names of the layer folders are always singular (`domain`, `application`, `infrastructure`, `ui`). The names of the folders in them are **plural nouns that give the type of the artefact**. This is the standard shape:

```text
features/<feature>/
  <feature>.module.ts                       — Module wiring: controllers, services, adapters, exports
  domain/
    models/
      <entity>.models.ts                    — Domain types for the entity
    dtos/
      create-<entity>.dto.ts                — Validated input contract
      update-<entity>.dto.ts
    repositories/
      <feature>.repository.ts               — Aggregate-collection port
    ports/
      <collaborator>.port.ts                — Every other driven port
    errors/
      <feature>.errors.ts                   — Domain error classes
    utils/
      <stem>.util.ts                        — Pure domain helper, no vendor types
    constants/
      <stem>.constants.ts                   — Domain constants and policy values, no vendor types
  application/
    <verb>-<entity>.use-case.ts             — One pure function per business operation
  infrastructure/
    <technology>/                           — Folder named after the technology or vendor
      <entity>-db.entity.ts                 — ORM entity
      <feature>-<technology>.repository.ts  — Implementation of a repositories/ interface
      <port>-<technology>.adapter.ts        — Implementation of a ports/ interface
      <stem>.transformer.ts                 — Persistence/vendor shape ◄► domain model
  ui/
    controllers/                            — HTTP entry point
    services/                               — Orchestration and dependency declaration
```

Usually, all the features must use this structure for their entities. But a layer can have more elements or fewer elements.

The name of an infrastructure sub-folder is the name of the technology or the vendor that the sub-folder contains (`database`, `docker`, `github`).

### Module wiring

Each feature declares its dependencies in its own module: the `controllers`, the `services`, the `guards` and the related infrastructure implementations. Thus the logic stays in one location.

If an element is necessary in the other features (for example, a repository that gives access to the database), the module declares the element in the `exports.` key.

### Cross-cutting concerns

Some behaviours apply to all the application. Thus they are configured one time at the root and are not repeated on each endpoint.

- **Authentication**: a global JWT guard protects all the routes by default. A request must be authenticated, if the route does not have a different mark. The `@Public()` decorator removes a route from this rule.
- **Rate limiting**: two named throttlers are read from the environment. The `default` throttler applies globally, and the `stream` throttler applies to the long-lived SSE connections. An endpoint can change these values locally. For example, the login endpoint limits itself with `@Throttle` (5 requests in 60 seconds). The log stream removes the `default` throttler with `@SkipThrottle` and applies `@Throttle` on `stream` in its place.
- **Security headers**: `helmet()` sets the secure HTTP headers at bootstrap.
- **Environment validation**: a `class-validator` schema validates each variable when the application starts. If a variable is missing or incorrect, the application stops immediately.
- **Error envelope**: a global exception filter returns the same shape for all the errors. It keeps the message arrays that the `ValidationPipe` makes, and it changes an unexpected error into a generic 500.

## Conventions

### Ports and dependency injection

The repositories and the other collaborators obey the **port and adapter** pattern:

- **Port**: a plain `interface` (for example, `DockerExecutor`). Its methods are arrow-function properties written in domain terms: they accept and return domain models and DTOs, and never ORM types or vendor types. A use case depends only on this interface.
- **Adapter**: an `@Injectable()` class that has `implements` for the port (for example, `DockerExecutorDockerodeAdapter`) of a `ports/` interface
- **Wiring**: the module puts the **concrete class** in its `providers`. The consumer injects the dependency **by class** (`@Inject(ProjectsDatabaseRepository)`, with `import type` for the port) and gives it the type of the **port**. Thus the `{ provide: TOKEN, useClass }` indirection is not necessary.

### Transformers

An infrastructure repository must not return a raw ORM entity or a vendor shape. The mapping stays in an adjacent `*.transformer.ts` file. The name of this file is the file stem of the repository. The file exports plain functions that change a persistence shape or a vendor shape into a domain model, for example `to<Model>(...)`. A different function in the same file does the opposite operation. The repositories call these functions where necessary (`rows.map(toProject)`). This rule applies to all the types of infrastructure.

### Persistence

- The TypeORM connection is configured one time in `CoreModule` with `forRootAsync`. The features call only `forFeature`. Thus there is no central list of the entities.
- The entities have the `@Entity('<plural_snake_case>')` decorator. They use UUID primary keys (`@PrimaryGeneratedColumn('uuid')`), which the domain model shows as `id: string`.
- `synchronize` is enabled only in the development environment. In production, the infrastructure migration system is used.
- Almost all the infrastructure entities have a related model in the domain layer. Each entity shows the business model as it is written into a persistence system.

### Validation

A write endpoint validates its input with DTO classes. The global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`, configured in `main.ts`) applies this validation. The DTOs stay in `domain/dtos/`. They are the only domain files that can import a framework and can use the `!` assertion, and they connect to the requests with `@Body()`. The pipe rejects unknown properties. Thus the DTO is the authoritative input contract. Nested payloads are validated with `@ValidateNested({ each: true })` and `@Type(() => Dto)`. Optional fields have the `@IsOptional()` decorator.

### HTTP and REST

The global route prefix is `api/v1`. The listen port comes from `getOrThrow('PORT')` and has no default value in the code. CORS uses credentials and permits only the allowlist that is read from the necessary `CORS_ORIGIN` variable. A controller declares only the path of its resource (`@Controller('projects')`).

| Method & path | Notes                                               |
|---------------|-----------------------------------------------------|
| `GET /`       | list (optionally filtered via cleaned query params) |
| `GET /:id`    | 404 when missing                                    |
| `POST /`      | `@Body()` create DTO                                |
| `PUT /:id`    | `@Body()` update DTO; 404 when missing              |
| `DELETE /:id` | `@HttpCode(204)`; 404 when missing                  |

The `:id` segment connects with `@Param('id', ParseUUIDPipe)`. **The not-found condition is an HTTP concern**: a repository returns `null` and `delete()` returns a `boolean`, and the controller raises `NotFoundException`. The domain never throws an HTTP exception. The domain raises a domain error, and the UI edge changes it.

### File naming

All the backend files must obey a naming convention. The conventions are as follows:

#### Domain

- **Models**: `<name>.models.ts`, where `name` is always in kebab-case. Example: `user.models.ts`.
- **Ports**: `<name>.port.ts`, where `name` is always in kebab-case. Example: `container-runtime.port.ts`.
- **Repositories**: `<name>.repository.ts`, where `name` is always in kebab-case. Example: `users.repository.ts`.

#### Application

- **Use cases**: `<name>.use-case.ts`, where `name` gives the purpose of the use case. Example: `get-containers-by-service.use-case.ts`.

#### Infrastructure

- **Adapters**: `<technology>-<name>.adapter.ts`, where `<name>` and `<technology>` are always in kebab case, and `<technology>` is the type of integration that the port uses. Example: `docker-container-runtime.adapter.ts`.
- **Repository implementations**: `<technology>-<name>.repository.ts`, where `<name>` and `<technology>` are always in kebab case, and `<technology>` is the type of integration that the repository uses. Example: `db-users.repository.ts`.
- **Database entities**: `<db>-<name>.entity.ts`, where `<name>` is always lowercase. Example: `db-project.entity.ts`.

### Class and function naming

#### Domain

- **Ports**: the name is in `PascalCase`. Example: `ContainerRuntime`.
- **Repositories**: the name is in `PascalCase`. It is the name of the entity plus `Repository`. Example: `UsersRepository`.

#### Application

- **Use cases**: the name is in `camelCase`. It gives the purpose of the use case and ends with `UseCase`. Example: `createProjectUseCase`.

#### Infrastructure

- **Adapters**: the name is in `PascalCase`. It is the name of the technology, plus the name of the entity, plus `Adapter`. Example: `DockerContainerRuntimeAdapter`.
- **Repository implementations**: the name is in `PascalCase`. It is the name of the technology, plus the name of the entity, plus `Repository`. Example: `DatabaseUsersRepository`.
- **Database entities**: the name is in `PascalCase`. It always starts with `Db`, then it gives the name of the entity, and it ends with `Entity`. Example: `DbProjectEntity`.

### Imports

- **Path aliases**: the aliases are defined in `tsconfig.json`. `@core/*` points to `./src/core/*`, `@features/*` points to `./src/features/*` and `@shared/*` points to `./src/shared/*`. Use the aliases for the imports between features and for the core and shared imports. Use relative paths in one feature.

### Inline comments

All the classes, the functions and the interfaces must have a JSDoc comment block. The conventions are:

- **Models**: one line that gives the purpose of the model in a short form.
- **Ports**: one line that gives the purpose of the port in a short form. Each method of the port must have its own JSDoc block with one line that gives the purpose of the method. If the method accepts parameters, write them with `@param parameterName Purpose`. If the method returns data, write the data with `@returns Returned data`.
- **Repositories**: one line that gives the purpose of the repository in a short form. Each method of the repository must have its own JSDoc block with one line that gives the purpose of the method. If the method accepts parameters, write them with `@param parameterName Purpose`. If the method returns data, write the data with `@returns Returned data`.

## Key flows

### Request

All the requests move through the layers in the same sequence, from the HTTP edge to the persistence and back:

```text
HTTP → ValidationPipe → Controller → Service → Use Case → Repository port ◄ adapter → PostgreSQL
```

### Durable queue (background work)

The caller must be able to start work without knowledge of the time when the work runs. Thus the producer puts a task in the queue, and a consumer takes the task from the queue later. The queue is **durable and at-least-once**. The tasks stay after a restart, they are tried again after a failure, and they go to the dead-letter state when there are no more attempts. The `deployments` feature is the reference. Its adapter keeps each task as a `deployment_queue_tasks` row and uses an internal RxJS `Subject` only as the in-process dispatch channel.

```text
queued ──(picked up)──► processing ──(ok)──► [row deleted]
   ▲                         │
   └──── retry (attempts<3) ─┤
                             └──(attempts exhausted)──► failed  (dead-letter;
                                                        deployment marked failed)
```

Each operation is a part of that lifecycle. `enqueue` writes the task as `queued` with `attempts=0` and then emits it. `markProcessing` sets the task to `processing` and increases its attempt count. `markCompleted` deletes the row, because the deployment itself holds the durable result. `markFailed` records the error and puts the task in the queue again while `attempts < 3`. If there are no more attempts, `markFailed` sends the task to the dead-letter state **and** sets the deployment to `failed`. Thus the deployment does not stay in `pending`. On a restart, `recoverPending` sets each `queued` row and each `processing` row back to `queued` and emits it again.

`POST /deployments` validates the request, writes a `pending` record, puts a run task in the queue, and returns the record **with its id** immediately. `DeploymentRunnerService` subscribes to the stream, and only then calls `recoverPending()`. It runs the tasks in sequence **for each compose-project name**, but it runs different projects at the same time:

```text
markProcessing → fetch repo archive (providers) → docker executor up()
  (fans each output line to the logs write port `append`)
  → mark success/failed → logStore.complete(status) → markCompleted
```

The use case handles the expected failures itself: a failed run becomes a `failed` status in the database. An unexpected throw goes to `markFailed`, which is the last safety net. `markFailed` then starts a new attempt or sends the task to the dead-letter state.

### Server-Sent Events (live streams)

To stream a long-running result, the application uses Server-Sent Events and not the CRUD table. The handler has the `@Sse(...)` annotation and returns an `Observable` of messages. It sends one JSON-encoded event for each value on one long-lived response. It operates together with the REST endpoints, which continue to give the durable history. The `logs` feature is the reference. It owns the durable `logs` table, the write port that the runner appends to, `GET /logs/:deploymentId/stream` (a stream of SSE `LogEvent`s), and `GET /logs?deploymentId=` (the history).

The log-stream endpoint is **not** `@Public()`. Thus it needs a Bearer token. The native `EventSource` API cannot set headers. Thus the frontend reads this stream with an SSE client that can send a token.

### Deployment log store

The `LogStore` port has **one** adapter, `DatabaseLogStoreAdapter`, and **one** store, the `logs` table. Thus the live delivery and the durable history are two views of the same rows, and not two systems that can become different.

```text
docker output ──► append() ──┬─► in-memory batch ──(100 lines | 250 ms)──► logs table
                             └─► per-deployment RxJS Subject ──► SSE subscribers

stream() ──► stored rows (replay) ──► live Subject   (deduplicated by seq)
```

- **`append`** gives the next sequence, puts the event in the in-memory batch of the deployment, and sends it on the `Subject` of the deployment. The batch is written after **100 lines or 250 ms**, whichever occurs first. `append` never rejects: the Docker stream callback calls it and does not wait for the result. Thus a failure of the store is recorded in the log and does not become an unhandled rejection.
- **`stream`** subscribes to the `Subject` *first*. Then it reads the stored rows of the deployment plus the batch that is not yet written. Only then does it deliver the events that came in the interval. Each event has a sequence. Thus the overlap between the replay and the live feed is deduplicated, and the change-over has no gap and no duplicate.
- **`complete`** writes the terminal `end` entry to the table *before* it sends the entry. Thus a subscriber that connects in that interval finds the entry during the replay and cannot stay in the "running" state.
- **`purge`** waits for the writes in progress to end, and then deletes the rows of the deployment.

The sequences are the only authority for the order. There is **one** monotonic counter for each deployment, which starts from `MAX(seq)` in the table. The persisted rows and the live events use the same counter. Because the counter starts from the value in the table, a stream that continues after a restart increases monotonically and does not hit the existing rows.

The shape gives two properties that the previous design did not have. First, **the history stays available after a run ends**: nothing expires, so the UI can always replay a completed run. Second, **a crash loses one unflushed batch as a maximum** — approximately 250 ms of output — and not the full run. `onModuleDestroy` writes each batch. Thus a controlled stop loses nothing.

Two necessary environment variables limit the growth. The application validates the two variables at boot, as it does for all the other settings:

| Variable               | Meaning                                                | Enforced                                        |
|------------------------|--------------------------------------------------------|-------------------------------------------------|
| `LOGS_MAX_LINES`       | Per-deployment cap; oldest entries are trimmed by `seq` | After every flush                               |
| `LOGS_RETENTION_HOURS` | Age window across all deployments                       | When a deployment completes (**opportunistic**) |

> The age sweep is opportunistic on purpose. The backend has no scheduler, and the completion of a deployment is the least expensive recurring hook. As a result, **an idle control plane never removes rows by age**. Only the line cap keeps one busy deployment in limits.

The `logs` table has an index for the two read paths: `(deploymentId, seq)` supports the ordered replay and the line-cap trim, and `createdAt` supports the age sweep.

### Authentication

The `authentication` feature connects JWT and Passport and registers the global guard. Thus all the routes need a valid access token by default. `@Public()`, a metadata flag that the reflector reads, removes a route from this rule. The feature gives `POST /auth/login` (public, rate-limited), `POST /auth/refresh` (public, rotates the tokens), `POST /auth/logout` (public, an idempotent revoke), and `GET /auth/me` (protected, without the password hash). A `@CurrentUser()` parameter decorator gives the user of the request.

- **Tokens**: at login, a local strategy validates the email and the password. On each protected request, a JWT strategy validates the Bearer token, finds the user again, and **rejects the accounts that are not active** (`isActive`). Thus a disabled user has no access immediately. The access token and the refresh token use different secrets and different lifetimes (`JWT_ACCESS_*` and `JWT_REFRESH_*`). The passwords have an argon2 hash.
- **Rotation**: the refresh tokens stay in the `refresh_tokens` table (with a cascade from their user). They are stored only as a SHA-256 hash, with a random `jti` from the token as the key. A refresh operation verifies the signature and the expiry, finds the row by `jti`, and rejects the token if the row is missing, revoked or expired. Then it compares the hash, verifies again that the user is active, and **revokes the old row and gives a new pair of tokens**. The rows are revoked and never deleted. Thus a token that is sent again is always rejected.

> RBAC is not implemented yet. Each user has a `role` (`admin` or `user`) in the database, but no authorization guard uses it.

### Docker-facing capabilities

- **Docker executor** (`deployments`): the `DockerExecutor` port gives this capability, and `DockerExecutorDockerodeAdapter` is the adapter. Its `up(archive, composePath, projectName, onLog)` operation extracts the GitHub tarball, builds the local `build:` services (it streams their output and changes them into image services), pulls the registry images, stops the old stack with `down()`, changes the healthcheck durations into nanoseconds (a `dockerode-compose` quirk), puts the GitPaaS ownership labels on each resource of the new stack, runs `up()`, and captures the startup logs of each container in limits. All the resources are in a group with a `com.docker.compose.project` name that comes from a slug of the project name.
- **Log store** (`logs`): the `LogStore` port (`append`, `complete`, `stream`, `purge`) gives this capability, with one adapter, `DatabaseLogStoreAdapter`, and the `logs` table behind it. See [Deployment log store](#deployment-log-store).
- **Cleanup**: the database cascade removes `service → deployments → logs`. `purge` deletes the log rows of a deployment when a deployment or a service is deleted. `deleteServiceUseCase` also removes the Docker resources with the `remove(service)` method of the `ServiceRuntimeResources` port. This step is a best-effort step. It force-removes the containers, the compose networks and the locally built images of the project that have the GitPaaS label, but it keeps the shared images that were pulled.
- **Server**: the `ServerPruner` port removes the unused images, volumes and stopped containers that have the GitPaaS label. The `OrphanContainers` port force-removes the containers that have the GitPaaS label and whose project agrees with no service (but never the control plane). If the daemon is not available, the error becomes a `503`. `GET /server/readiness` is **public**. It examines PostgreSQL and the Docker daemon at the same time, each one through a `HealthProbe` port. A throw counts as `down` and the aggregate never rejects. The endpoint returns `200` with the condition of each dependency when all of them are up, or `503` with the same data in the other cases. `GET /server/status` is **not** public. It gives the daemon information that it reads through the `ContainerRuntime` port of Core. Thus it shows that the daemon is available and that its credentials are valid. Core owns that port and its adapter, because the runtime is structural. The feature owns the HTTP edge and the use case that reads the data.
- **Read-only**: `containers` and `networks` list the containers and the compose networks of a service by label. `providers` (a GitHub App) lists the repositories and the branches, finds the head commits, and gets the source archives. None of these features uses the database.

#### Docker resource labelling

GitPaaS uses the same daemon as the control plane and as the third-party stacks. Thus labels give the ownership: the marker label shows that a resource is a GitPaaS resource, and the project label shows the stack of the applicable service.

| Label                        | Value              | Purpose                                    |
|------------------------------|--------------------|--------------------------------------------|
| `io.gitpaas.managed`         | `true`             | GitPaaS created this resource              |
| `io.gitpaas.project`         | service slug       | Which service's stack it belongs to        |
| `com.docker.compose.project` | service slug       | Compose grouping (also set by the library) |
| `com.docker.compose.service` | compose service    | Compose service (also set by the library)  |

## Operations

| Script                | Command                               |
|-----------------------|---------------------------------------|
| `dev`                 | `nest start --watch`                  |
| `build`               | `nest build`                          |
| `start` / `start:prod`| `nest start` / `node dist/main`       |
| `lint` / `test`       | `eslint .` / `jest` (plus `test:e2e`) |

### Schema management

The backend has a **factory** that is the source of truth for the database connection. It sets `synchronize` to `NODE_ENV !== 'production'` and registers the entities **by glob**. Thus no code makes a list of them. The extension in the glob agrees with the mode of the process (`.ts` with ts-jest or ts-node, `.js` in `dist/` at runtime). `CoreModule` uses those options and adds `autoLoadEntities: true`. Thus Nest also finds the entities that `forFeature` registers.

- **Development**: TypeORM `synchronize` creates and updates the schema from the entities.
- **Production**: the schema stays in plain SQL files in `iac/production/migrations/`. See [infrastructure architecture](./infrastructure-architecture.md#schema-bootstrap).

If the schemas change, **you must make the same change in a manually written `.sql` file** in `iac/production/migrations/`. Use the exact column types, the exact defaults and the exact constraint names that TypeORM needs.

## Related docs

For the steps to add a feature, use the `backend-feature` skill. For data about the domain workflows, see [backend business](./backend-business.md).

- [Backend business](./backend-business.md) — domain workflows and rules
- [Frontend architecture](./frontend-architecture.md)
- [Infrastructure architecture](./infrastructure-architecture.md)
- [Monorepo architecture](./monorepo-architecture.md)
