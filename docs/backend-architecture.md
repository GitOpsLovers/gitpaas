# Backend Architecture

Architectural principles of the backend app (`apps/backend`): a **NestJS v11** (Express) REST API over **PostgreSQL** via **TypeORM**. Code is split into **feature modules**, each following a **hexagonal / clean** layout. For the step-by-step procedure to add a feature, use the `backend-feature` skill; for the domain workflows, see [backend-business.md](./backend-business.md).

## The four layers

Every feature is split into four layers with a strict inward dependency rule: **outer layers depend on inner, never the reverse.** `domain` and `application` are pure, framework-free TypeScript; NestJS and TypeORM live only at the edges (`infrastructure`, `ui`).

```
ui ──────► application ──────► domain
(controllers,  (use cases)   (models, ports, DTOs)
 services)                        ▲
   └────► infrastructure ─────────┘
          (adapters: TypeORM, Docker, Redis, GitHub…)
```

| Layer | Holds | Framework? |
|------------|---|---|
| **domain** | `models/` (plain interfaces + input/filter types), `repositories/` (port interfaces, arrow-fn props, domain terms only), `dtos/` (class-validator classes). Sub-folders as needed: `queues/`, `executors/`, `errors/`. | No — except DTOs |
| **application** | One `<verb>-<entity>.use-case.ts` per operation: a pure function receiving ports as params, exported as `<verb><Entity>UseCase`. | No |
| **infrastructure** | Adapters implementing the ports, sub-foldered by tech (`database/`, `docker/`, `redis/`, `github/`, `rxjs/`, `log-store/`). Each pairs with a sibling `*.transformer.ts`. | Yes |
| **ui** | `controllers/` (thin: routing, param/query extraction, HTTP errors) and `services/` (NestJS DI bridge handing injected adapters to use cases). | Yes |

This keeps use cases trivially testable (call the function with a fake port) and business rules independent of delivery mechanism.

### Per-feature structure (`projects` = reference example)

```
features/projects/
  projects.module.ts
  domain/
    models/project.model.ts               — Project { id, name }
    repositories/projects.repository.ts    — ProjectsRepository (port)
    dtos/{create,update}-project.dto.ts
  application/                             — one *.use-case.ts per op
  infrastructure/database/
    project-db.entity.ts                   — ProjectDbEntity
    projects-db.repository.ts              — ProjectsDatabaseRepository
    projects-db.transformer.ts             — toProject
  ui/{controllers,services}/
```

## Ports & dependency injection

Repositories (and other collaborators like the queue) are expressed as **port + adapter**, wired **without a custom token**:

- **Port** — a plain `interface` (e.g. `ProjectsRepository`), methods as arrow-fn properties in domain terms (accept/return domain models and DTOs, never ORM/vendor types). Use cases depend only on this.
- **Adapter** — an `@Injectable()` class that `implements` the port (e.g. `ProjectsDatabaseRepository`).
- **Wiring** — the module lists the **concrete class** in `providers`; consumers inject **by class** (`@Inject(ProjectsDatabaseRepository)`, `import type` for the port type) but type the dependency as the **port**. No `{ provide: TOKEN, useClass }` indirection.

```typescript
@Module({
    imports: [TypeOrmModule.forFeature([ProjectDbEntity])],
    controllers: [ProjectsController],
    providers: [ProjectsService, ProjectsDatabaseRepository],
})
export class ProjectsModule {}
```

DTOs **flow whole** through the write path (`create(dto)`, `update(id, dto)`) — never unpacked into primitives.

> The port-typed-dependency convention is the intended norm; a few edge services still inject concrete types directly. Follow the convention in new code.

### Transformers: infra always returns domain models

No infrastructure repository returns raw ORM entities or vendor/Redis shapes. Mapping lives in a **sibling `*.transformer.ts`** next to the repository, named after the repo's file stem. Transformers are **plain exported functions** named `to<Model>(...)` (persistence/vendor → domain); the reverse direction, when needed, is another function in the same file. Repos import and call them (`rows.map(toProject)`). This holds across every infra flavour.

## Persistence

- Root TypeORM connection configured once in `CoreModule` (`autoLoadEntities: true`, `synchronize: NODE_ENV !== 'production'`). Features only call `forFeature`. No migrations, no central entity list.
- Entities: `@Entity('<plural_snake_case>')`, class names end `DbEntity`. **UUID PKs** (`@PrimaryGeneratedColumn('uuid')`; domain `id: string`).
- Custom column transformers convert non-native types at the persistence boundary.
- **Data-level FK** is a *table* relationship, independent of module-DI direction: a child owns `@ManyToOne(() => ParentDbEntity, { onDelete: 'CASCADE' })`. The chain `project ◄ service ◄ deployment ◄ logs` cascades on delete.

## Validation

Write endpoints validate through **DTO classes** (class-validator), enforced by the global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform` in `main.ts`). DTOs live in `domain/dtos/`, are the only domain files allowed to import a framework, use the `!` assertion, and bind via `@Body()`. Unknown properties are rejected, so the DTO is the authoritative input contract. Nested payloads use `@ValidateNested({ each: true })` + `@Type(() => Dto)`; optional fields use `@IsOptional()`.

## HTTP & REST conventions

Global prefix `api/v1` (set in `main.ts`); CORS on; port `PORT ?? 3000`. Controllers declare only the resource path (`@Controller('projects')`). CRUD shape:

| Method & path | Notes |
|---|---|
| `GET /` | list (optionally filtered via cleaned query params) |
| `GET /:id` | 404 when missing |
| `POST /` | `@Body()` create DTO |
| `PUT /:id` | `@Body()` update DTO; 404 when missing |
| `DELETE /:id` | `@HttpCode(204)`; 404 when missing |

`:id` bound with `@Param('id', ParseUUIDPipe)`. **Not-found is an HTTP concern**: repos return `null` and `delete()` returns `boolean`; the controller translates that into `NotFoundException`. The domain never throws HTTP exceptions.

### Data flow

```
HTTP → ValidationPipe → Controller → Service → Use Case → Repository port ◄ adapter → PostgreSQL
```

## Cross-feature collaboration

Most features collaborate by importing a neighbour and injecting its exported repository (one-way module DI). Two patterns cover what plain CRUD-over-import does not:

### Queue (decouple sync response from background work)

To trigger work without coupling the caller to when/how it runs, enqueue a task on a **dependency-free queue** and let a consumer dequeue it. The queue is a **port + adapter**: domain declares `DeploymentQueue` with `enqueue(task)`; the producing feature's infrastructure supplies `RxjsDeploymentQueue` (wraps an RxJS `Subject`, exposes `dequeued$`) and **exports** it. Payload is the `DeploymentRunTask` domain model.

The **deployments** feature is the reference. `POST /deployments` validates, persists a `pending` record, enqueues a run task, and returns the record (**with id**) immediately — the run is fire-and-forget. A background `DeploymentRunnerService` (`OnModuleInit`) subscribes to `dequeued$` and drives `runDeploymentUseCase`:

```
mark running → fetch repo archive (providers) → docker executor up()
  (fans each output line to the logs write port `append`)
  → mark success/failed → logStore.complete(status)
```

The runner self-handles failures (a failed run becomes a persisted `failed` status, not an unhandled throw), with a last-resort guard in the subscriber.

### Server-Sent Events (live streams)

Streaming a long-running result uses **SSE**, not the CRUD table: a handler is `@Sse(...)` and returns an `Observable` of messages, one JSON-encoded event per emission, over a single long-lived response. It sits alongside the normal REST endpoints (which still serve durable history).

The **logs** feature is the reference. It records and streams a deployment's output, owning the durable `logs` table and the write port the runner appends to.

## Notable infrastructure

**Docker executor (deployments).** Port `DockerExecutor`; adapter `DockerodeDockerExecutor` (dockerode + dockerode-compose). `up(archive, composePath, projectName, onLog)`: extract the GitHub tarball, build local `build:` services (streaming output, rewriting to image services), pull registry images, `down()` the old stack, normalize healthcheck durations to nanoseconds (works around dockerode-compose quirks), `up()`, and capture bounded per-container startup logs. Resources are grouped under a `com.docker.compose.project` name derived from a project-name slug.

**Logs write port + Redis + DB.** Port `LogStoreRepository` (`append` / `complete` / `stream` / `purge`), two adapters:
- `RedisLogStoreRepository` — live buffer + pub/sub. Per-deployment list key (capped ~5000 lines), a seq counter, an events channel, 24h TTL. `stream()` replays the buffer then tails live pub/sub, dedupes by seq, completes on the terminal `end` event.
- `PersistentLogStoreRepository` — **the port consumers actually inject**. Buffers in-memory, delegates live fan-out to Redis, and on `complete` persists the finished stream to the `logs` table (`createMany`), then completes Redis. `purge` drops in-memory + Redis; DB rows go by cascade.

SSE endpoint `GET /logs/:deploymentId/stream` emits `LogEvent`s; durable history via `GET /logs?deploymentId=`.

> The logs feature also exposes generic CRUD endpoints, but the append/stream path above is its real usage in the deployment flow.

**Deletion / cleanup.** DB FK cascade removes `service → deployments → logs`. Redis logs are purged on **deployment delete** and **service delete**. On service delete, `deleteServiceUseCase` also tears down the service's Docker footprint via `ServiceFootprintRepository.remove(service)` (best-effort per-resource: force-removes labeled containers + compose networks + images built for that project as `${projectName}_*`, **keeping shared pulled images**), then purges each deployment's Redis logs.

**Server maintenance.** `ServerPrunerRepository` prunes images/volumes/stopped-containers (`PruneResult`). A separate `OrphanContainersRepository` force-removes Artifactory compose-labeled containers whose project matches no existing service (`OrphanRemovalResult`). The controller maps a daemon-unreachable error to `503` with a local-dev hint.

**Read-only Docker features.** `containers` and `networks` list a service's running containers / compose networks by label; `providers` (GitHub App) lists repos/branches, resolves head commits, and fetches source archives. None use the DB.

## Module wiring

- `AppModule` imports `CoreModule` + every feature module.
- `services` ↔ `deployments` resolve their mutual dependency via `forwardRef` on both sides. `deployments` imports `logs`, `providers`, `services` and exports its DB repository + queue.
- **`@Global() CoreModule`** provides shared, dependency-free infrastructure injectable everywhere without importing a feature: root TypeORM config, `DockerClient` (lazy Dockerode over **TLS** to the VPS/DinD daemon, reads certs from `VPS_DOCKER_CERT_PATH`, 503 if missing), `RedisClient`, `DiagnosticLoggerService` (thin `Logger` wrapper), env validation, a global exception filter, and a docker controller.

## Conventions

- **JSDoc:** one-line block on every export; fuller `@param`/`@returns` on repos, services, and use cases. Mirror the existing style of the same file type.
- **Naming:** models `<Entity>` in `models/<entity>.model.ts`; ports `<Feature>Repository`; entities `…DbEntity`; adapters `…DatabaseRepository`; use cases `<verb>-<entity>.use-case.ts` → `<verb><Entity>UseCase`; tables plural snake_case.
- **Path aliases** (`apps/backend/tsconfig.json`): `@core/*` → `./src/core/*`, `@features/*` → `./src/features/*`. Use them for cross-feature/core imports; relative paths within a feature.

## Scripts (`apps/backend/package.json`)

`dev` (`nest start --watch`), `build` (`nest build`), `start` / `start:prod`, `lint` (`eslint .`), `test` (`jest`), `test:e2e`.
