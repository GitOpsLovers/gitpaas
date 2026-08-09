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

- **`core/`** holds only the **structural elements that make the application operate**: the configuration and the environment validation, the database connection, the container runtime, the global exception filter and the application logging.
- **`features/`** is the default location. If an element is part of one business domain, it stays in the feature of that domain and in no other place.
- **`shared/`** holds **the reusable functions that are not structural and that are not part of one domain**:.

### The four layers

Each feature has four different layers. There is one strict rule: **an outer layer can depend on an inner layer, but an inner layer can never depend on an outer layer.**

**Domain Layer**

This layer holds the models, the repository and port interfaces, the DTOs, the errors and all the other elements that give the business model. These elements do not depend on the other layers and do not use a specified technology. The DTOs are the only exception, because they use `class-validator`.

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

---

## Conventions

### Ports and dependency injection

The repositories and the other collaborators obey the **port and adapter** pattern:

- **Port**: a plain `interface` (for example, `ProjectsRepository`). Its methods are arrow-function properties written in domain terms: they accept and return domain models and DTOs, and never ORM types or vendor types. A use case depends only on this interface.
- **Adapter**: an `@Injectable()` class that has `implements` for the port (for example, `DatabaseProjectsRepository`) of a `repositories/` interface
- **Wiring**: the module puts the **concrete class** in its `providers`. The consumer injects the dependency **by class** (`@Inject(ProjectsDatabaseRepository)`, with `import type` for the port) and gives it the type of the **port**.

### Transformers

An infrastructure repository must not return a raw ORM entity or a vendor shape. The mapping stays in an adjacent `*.transformer.ts` file. The file exports plain functions that change a persistence shape or a vendor shape into a domain model, for example `to<Model>(...)`. A different function in the same file does the opposite operation. The repositories call these functions where necessary (`rows.map(toProject)`). This rule applies to all the types of infrastructure.

### Persistence

- The TypeORM connection is configured one time in `CoreModule` with `forRootAsync`. The features call only `forFeature`. Thus there is no central list of the entities.
- The entities have the `@Entity('<plural_snake_case>')` decorator. They use UUID primary keys (`@PrimaryGeneratedColumn('uuid')`), which the domain model shows as `id: string`.
- `synchronize` is enabled only in the development environment. In production, the infrastructure migration system is used.
- Almost all the infrastructure entities have a related model in the domain layer. Each entity shows the business model as it is written into a persistence system.

### Validation

A write endpoint validates its input with DTO classes. The global `ValidationPipe` applies this validation. The DTOs stay in `domain/dtos/`. They are the only domain files that can import a framework and can use the `!` assertion, and they connect to the requests with `@Body()`. The pipe rejects unknown properties. Thus the DTO is the authoritative input contract. Nested payloads are validated with `@ValidateNested({ each: true })` and `@Type(() => Dto)`. Optional fields have the `@IsOptional()` decorator.

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

Each feature declares its domain error classes in `domain/errors/`, in a file with the name pattern `<entity>.errors.ts` (for example, `container.errors.ts`). These classes extend `Error` and contain no HTTP data. Only the controller changes them into a Nest HTTP exception.

Two deviations from this rule are known and intentional:

- The Passport strategies (`features/authentication/infrastructure/passport/jwt.strategy.ts` and `local.strategy.ts`) throw `UnauthorizedException` because the guard runs before any controller method. Thus no controller can do the translation.
- `features/providers/infrastructure/github/github-providers.adapter.ts` throws `ServiceUnavailableException` because a non-HTTP background worker also uses this adapter, and the error must stay the same for the two consumers.

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

---

## Key flows

### Request

All the requests move through the layers in the same sequence, from the HTTP edge to the persistence and back:

```text
HTTP → ValidationPipe → Controller → Service → Use Case → Repository port ◄ adapter → PostgreSQL
```

### Durable queue (background work)

The caller must be able to start work without knowledge of the time when the work runs. Thus a producer queues a task and a consumer takes it later. The queue is **durable and at-least-once**: each task is a database row, so the tasks stay after a restart, and an in-process channel only tells the consumer that there is new work. The `deployments` feature is the reference.

```text
queued ──(picked up)──► processing ──(ok)──► [row deleted]
   ▲                         │
   └──── retry (attempts<3) ─┤
                             └──(attempts exhausted)──► failed  (dead-letter;
                                                        deployment marked failed)
```

A successful run deletes the row, because the deployment record holds the durable result. A failure records the error and queues the task again, up to three attempts. After the last attempt, the task goes to the dead-letter state **and** the deployment becomes `failed`, so no deployment stays `pending` for ever. At start-up, each unfinished task returns to `queued`, so work that a crash interrupted runs again.

The caller sees only the fast part: the request validates its input, writes a `pending` record, queues a run task, and returns the record **with its id** immediately. The consumer runs the tasks in sequence **for each compose project**, but different projects run at the same time. Thus a slow build does not delay the other stacks, and two runs of one stack cannot mix.

```text
mark processing → fetch repo archive → docker deploy
  (fans each output line to the log store)
  → mark success/failed → close the log stream → mark completed
```

An expected failure becomes a `failed` status, and the task ends correctly; the retry path is the last safety net, for an unexpected error only. Because delivery is at-least-once, a run can occur two times. The deploy operation tolerates this, because it always stops the old stack first.

### Server-Sent Events (live streams)

To send a long-running result to the client, the application uses Server-Sent Events: one long-lived response that carries one JSON-encoded event for each value. An SSE endpoint always has a REST companion that gives the durable history — in the `logs` feature, one endpoint for the live events of a deployment and one for its history.

A stream endpoint is not public, so it needs a Bearer token. The native `EventSource` API cannot set headers. Thus the frontend reads the stream with an SSE client that can send a token.

### Deployment log store

The live delivery and the durable history are two views of **the same rows** in one table, and not two systems that can become different.

```text
docker output ──► write ──┬─► in-memory batch ──(100 lines | 250 ms)──► logs table
                          └─► per-deployment live channel ──► SSE subscribers

read stream ──► stored rows (replay) ──► live channel   (deduplicated by seq)
```

A new line goes to the live channel immediately and to an in-memory batch. The batch goes to the table after **100 lines or 250 ms**, whichever occurs first. Thus the store does not write to the database for each line, but the subscribers see no delay. A write never rejects: a store failure goes to the application log only.

A new subscriber attaches to the live channel **before** it reads the recorded rows, and then delivers the events of that interval. Thus the change-over has no gap. The terminal event goes to the table before it goes to the channel, so a client that connects at that moment cannot stay in the "running" condition.

One sequence counter for each deployment gives the order to the rows and to the live events. It starts from the highest sequence in the table, so the numbers always increase, also after a restart, and the overlap of the replay and the live feed is easy to deduplicate.

Two guarantees result: **the history stays available after a run ends**, because nothing expires, and **a crash loses one batch as a maximum** (approximately 250 ms of output). A controlled stop loses nothing. Two necessary environment variables limit the growth:

| Variable               | Meaning                                                | Enforced                                        |
|------------------------|--------------------------------------------------------|-------------------------------------------------|
| `LOGS_MAX_LINES`       | Per-deployment cap; oldest entries are trimmed by `seq` | After every flush                               |
| `LOGS_RETENTION_HOURS` | Age window across all deployments                       | When a deployment completes (**opportunistic**) |

> The age sweep is opportunistic on purpose: the backend has no scheduler, and the completion of a deployment is the least expensive recurring hook. As a result, **an idle control plane never removes rows by age**. Only the line cap keeps a busy deployment in limits.

The table has an index for each of the two read paths: the ordered replay and the age sweep.

### Authentication

A global guard protects all the routes by default. A metadata flag makes a route public — the login and the refresh operations, because the caller has no access token at that moment. The login endpoint is rate-limited.

- **Tokens**: at login, the application validates the email and the password (the passwords have an argon2 hash). On each protected request, it validates the Bearer token, finds the user again, and **rejects the accounts that are not active**. Thus a disabled account loses access immediately, and not at the expiry of its token. The two token types use different secrets and lifetimes.
- **Rotation**: the refresh tokens stay in the database only as a hash, so a person who reads the table cannot make a token. A refresh operation verifies the signature, the expiry, the row and the hash, verifies again that the user is active, and then revokes the old row and gives a new pair. A row is revoked and never deleted, so a token that is sent two times is always rejected.

> RBAC is not implemented yet. Each user has a role (`admin` or `user`) in the database, but no authorization guard uses it.

### Docker-facing capabilities

The features that touch Docker use the same arrangement: a domain port gives the capability in business terms, and one infrastructure adapter speaks to the daemon. Thus the use cases stay independent of the container technology. The container runtime is structural, so `core/` owns that port.

- **Deploy**: the operation extracts the source archive, builds the services that need a build, pulls the other images, stops the old stack, labels each new resource, starts the stack, and captures a limited quantity of start-up output. It reports each line while it operates, so the run is visible in the live log.
- **Logs**: one port gives the write, the read, the end and the removal of the output of a deployment. See [Deployment log store](#deployment-log-store).
- **Cleanup**: the database cascade removes the deployments and the logs of a service, and the delete operation also removes the containers, the networks and the images that GitPaaS built. It keeps the images that it pulled, because other stacks can use them, and it is best-effort: a daemon failure does not stop the delete operation in the database.
- **Server**: the maintenance operations remove the unused resources and the containers that belong to no service. They select only the resources that have the GitPaaS labels, so they never touch the control plane. The readiness endpoint is public: it examines the database and the daemon at the same time, counts an error as "down", and returns `200` or `503` with the condition of each one.
- **Read-only**: some features only read from Docker or from GitHub, and use no database table.

#### Docker resource labelling

GitPaaS uses the same daemon as the control plane and as the third-party stacks. Thus labels give the ownership: the marker label shows that a resource is a GitPaaS resource, and the project label shows the stack of the applicable service.

| Label                        | Value              | Purpose                                    |
|------------------------------|--------------------|--------------------------------------------|
| `io.gitpaas.managed`         | `true`             | GitPaaS created this resource              |
| `io.gitpaas.project`         | service slug       | Which service's stack it belongs to        |
| `com.docker.compose.project` | service slug       | Compose grouping (also set by the library) |
| `com.docker.compose.service` | compose service    | Compose service (also set by the library)  |

---

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
