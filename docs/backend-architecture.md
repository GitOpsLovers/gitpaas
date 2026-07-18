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
| **domain** | `models/` (plain interfaces + input/filter types), `repositories/` (port interfaces, arrow-fn props, domain terms only), `dtos/` (class-validator classes). Sub-folders as needed: `queues/`, `executors/`, `errors/`, `security/`. | No — except DTOs |
| **application** | One `<verb>-<entity>.use-case.ts` per operation: a pure function receiving ports as params, exported as `<verb><Entity>UseCase`. | No |
| **infrastructure** | Adapters implementing the ports, sub-foldered by tech (`database/`, `docker/`, `redis/`, `github/`, `passport/`, `security/`, `log-store/`). Each persistence/vendor adapter pairs with a sibling `*.transformer.ts`. | Yes |
| **ui** | `controllers/` (thin: routing, param/query extraction, HTTP errors) and `services/` (NestJS DI bridge handing injected adapters to use cases). Also holds delivery-mechanism concerns like `guards/` and `decorators/` when a feature needs them. | Yes |

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
- **Wiring** — the module lists the **concrete class** in `providers`; consumers inject **by class** (`@Inject(ProjectsDatabaseRepository)`, `import type` for the port type) but type the dependency as the **port**. No `{ provide: TOKEN, useClass }` indirection. See [`apps/backend/src/features/projects/projects.module.ts`](../apps/backend/src/features/projects/projects.module.ts) for the reference wiring.

DTOs **flow whole** through the write path (`create(dto)`, `update(id, dto)`) — never unpacked into primitives.

> The port-typed-dependency convention is the intended norm; a few edge services still inject concrete types directly. Follow the convention in new code.

### Transformers: infra always returns domain models

No infrastructure repository returns raw ORM entities or vendor/Redis shapes. Mapping lives in a **sibling `*.transformer.ts`** next to the repository, named after the repo's file stem. Transformers are **plain exported functions** named `to<Model>(...)` (persistence/vendor → domain); the reverse direction, when needed, is another function in the same file. Repos import and call them (`rows.map(toProject)`). This holds across every infra flavour.

## Persistence

- Root TypeORM connection configured once in `CoreModule` (`autoLoadEntities: true`, `synchronize: NODE_ENV !== 'production'`). Features only call `forFeature`. No central entity list.
- Entities: `@Entity('<plural_snake_case>')`, class names end `DbEntity`. **UUID PKs** (`@PrimaryGeneratedColumn('uuid')`; domain `id: string`).
- Custom column transformers convert non-native types at the persistence boundary.
- **Data-level FK** is a *table* relationship, independent of module-DI direction: a child owns `@ManyToOne(() => ParentDbEntity, { onDelete: 'CASCADE' })`. Two cascade relationships exist today: the `project ◄ service ◄ deployment ◄ logs` chain, and `refresh_token ► user` (a user's refresh tokens cascade-delete with the user). The persisted deployment-queue table deliberately has **no** FK to its deployment — the two have independent lifecycles.

### Schema management (no migrations)

There is **no migration tooling** and no migration files in-tree. Schema changes are applied by TypeORM's `synchronize`, which is **on in development and off in production** (`NODE_ENV`-gated). Production is therefore expected to move to managed migrations, but that tooling is not yet configured — treat entity edits as dev-only auto-sync for now. There is no user-provisioning endpoint or in-tree seed script either; the first user(s) are provisioned out-of-band (see the authentication section).

## Validation

Write endpoints validate through **DTO classes** (class-validator), enforced by the global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform` in `main.ts`). DTOs live in `domain/dtos/`, are the only domain files allowed to import a framework, use the `!` assertion, and bind via `@Body()`. Unknown properties are rejected, so the DTO is the authoritative input contract. Nested payloads use `@ValidateNested({ each: true })` + `@Type(() => Dto)`; optional fields use `@IsOptional()`.

## HTTP & REST conventions

Global prefix `api/v1` (set in `main.ts`). Bootstrap also installs `helmet()` for baseline security headers and enables **credentialed CORS** restricted to an allowlist parsed from the required `CORS_ORIGIN` env var. The listen port comes from the validated env (`getOrThrow('PORT')`) — there is no hard-coded fallback. Every route is **authenticated by default** (see [Authentication](#authentication-global-guard--tokens)); public endpoints opt out explicitly. Controllers declare only the resource path (`@Controller('projects')`). CRUD shape:

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

### Queue (durable, DB-backed background work)

To trigger work without coupling the caller to when/how it runs, a task is enqueued and a consumer dequeues it. The queue is a **port + adapter**: domain declares a `DeploymentQueue` port; the producing feature's infrastructure supplies the adapter and **exports** it. Unlike a fire-and-forget in-memory queue, this queue is **durable and at-least-once** — tasks survive process restarts, are retried on failure, and are dead-lettered when their attempts run out. Payload is the `DeploymentRunTask` domain model.

The **deployments** feature is the reference. The DB-backed adapter persists each task as a row in a `deployment_queue_tasks` table and uses an internal RxJS `Subject` **only** as the in-process dispatch channel to the runner — no queue state lives solely in memory. A queue row moves through three states:

```
queued ──(picked up)──► processing ──(ok)──► [row deleted]
   ▲                         │
   └──── retry (attempts<3) ─┤
                             └──(attempts exhausted)──► failed  (dead-letter;
                                                         deployment marked failed)
```

The port's operations map onto that lifecycle:

- **enqueue** — persist a row (`status='queued'`, `attempts=0`), then emit it for immediate pickup.
- **markProcessing** — set `processing` and increment `attempts`.
- **markCompleted** — delete the row (terminal success; the deployment carries the durable outcome).
- **markFailed** — record the error; re-enqueue while `attempts < MAX_ATTEMPTS` (=3), otherwise dead-letter the row (`status='failed'`) **and** mark the deployment `failed` so it is never stranded in `pending`.
- **recoverPending** — on restart, reset every unfinished (`queued`/`processing`) row back to `queued` and re-emit it.

`POST /deployments` validates, persists a `pending` deployment record, enqueues a run task, and returns the record (**with id**) immediately. A background `DeploymentRunnerService` (`OnModuleInit`) subscribes to the queue's stream and only then calls `recoverPending()` so interrupted work resumes. It serializes runs **per compose-project name** (RxJS `groupBy` + `concatMap`) while running distinct projects concurrently (`mergeMap`) — same-project `down`/`up` never race, but unrelated services still deploy in parallel. Each run drives `runDeploymentUseCase`:

```
markProcessing → fetch repo archive (providers) → docker executor up()
  (fans each output line to the logs write port `append`)
  → mark success/failed → logStore.complete(status) → markCompleted
```

The use case self-handles expected failures (a failed run becomes a persisted `failed` status), and any truly-unexpected throw hits `markFailed` as a last-resort net that triggers retry/dead-lettering.

### Server-Sent Events (live streams)

Streaming a long-running result uses **SSE**, not the CRUD table: a handler is `@Sse(...)` and returns an `Observable` of messages, one JSON-encoded event per emission, over a single long-lived response. It sits alongside the normal REST endpoints (which still serve durable history).

The **logs** feature is the reference. It records and streams a deployment's output, owning the durable `logs` table and the write port the runner appends to.

## Authentication (global guard & tokens)

Authentication is a cross-cutting security posture, not a per-endpoint opt-in. The **authentication** feature wires JWT + Passport and registers a **global** guard (`APP_GUARD`) so **every route across the app requires a valid access token by default**. Endpoints that must be reachable without a token opt out with a `@Public()` decorator (a reflector-driven metadata flag the global guard reads). Guards and decorators live in the feature's `ui/` layer, following the same layering rule as controllers.

The feature exposes an `auth` controller: `POST /auth/login` (public, rate-limited, credential check via a local Passport strategy), `POST /auth/refresh` (public — rotates tokens), `POST /auth/logout` (public, idempotent revoke), and `GET /auth/me` (protected, returns the current user with the password hash stripped). A `@CurrentUser()` param decorator surfaces the request's authenticated user.

**Token model.** Two Passport strategies back it: a local strategy validating email + password on login, and a JWT strategy validating the Bearer access token on every protected request. The JWT strategy re-resolves the user on each request and **rejects deactivated accounts** (`isActive`), so a disabled user is locked out immediately rather than at token expiry. Access and refresh tokens are signed with **separate secrets and lifetimes** (`JWT_ACCESS_*` / `JWT_REFRESH_*`). Passwords are hashed with **argon2**.

**Refresh-token rotation.** Refresh tokens are persisted in a `refresh_tokens` table (cascading with their user), stored **only as a SHA-256 hash** — never in plaintext — and keyed by a random `jti` carried in the token. Refreshing verifies the signature/expiry, looks up the stored row by `jti`, rejects it if missing/revoked/expired, compares the hash, re-checks that the user still exists and is active, then **revokes the old row and issues a fresh pair**. Rows are revoked, never deleted, so a replayed or already-rotated token is rejected.

**Domain stays HTTP-free.** The feature raises domain errors (invalid credentials, invalid refresh token, inactive user); the service/strategy edge translates them into `UnauthorizedException`.

> **RBAC is deferred.** A `role` (`admin` | `user`) is persisted on users but **no authorization guard consumes it yet** — every authenticated user has equal access. The field is groundwork, not enforced authz.

> **SSE and auth.** The log-stream endpoint is protected (not `@Public()`), so it needs a Bearer token. Native `EventSource` cannot set an `Authorization` header, so the frontend must stream via a token-capable SSE client.

### Users (support feature)

The **users** feature is intentionally minimal: it has only `domain/` and `infrastructure/` layers — **no controller and no create-user use case**. It owns the `users` table (unique email, password hash, role, active flag, timestamps) and exports its repository (and `TypeOrmModule`) so `authentication` can read and verify credentials. There is deliberately **no public sign-up**: users are provisioned by an administrator out-of-band. This is the one feature that does not follow the full four-layer shape, by design.

## Notable infrastructure

**Docker executor (deployments).** Port `DockerExecutor`; adapter `DockerodeDockerExecutor` (dockerode + dockerode-compose). `up(archive, composePath, projectName, onLog)`: extract the GitHub tarball, build local `build:` services (streaming output, rewriting to image services), pull registry images, `down()` the old stack, normalize healthcheck durations to nanoseconds (works around dockerode-compose quirks), `up()`, and capture bounded per-container startup logs. Resources are grouped under a `com.docker.compose.project` name derived from a project-name slug.

**Logs write port + Redis + DB.** Port `LogStoreRepository` (`append` / `complete` / `stream` / `purge`), two adapters:
- `RedisLogStoreRepository` — live buffer + pub/sub. Per-deployment list key (capped ~5000 lines), a seq counter, an events channel, 24h TTL. `stream()` replays the buffer then tails live pub/sub, dedupes by seq, completes on the terminal `end` event.
- `PersistentLogStoreRepository` — **the port consumers actually inject**. Buffers in-memory, delegates live fan-out to Redis, and on `complete` persists the finished stream to the `logs` table (`createMany`), then completes Redis. `purge` drops in-memory + Redis; DB rows go by cascade.

SSE endpoint `GET /logs/:deploymentId/stream` emits `LogEvent`s; durable history via `GET /logs?deploymentId=`.

> The logs feature also exposes generic CRUD endpoints, but the append/stream path above is its real usage in the deployment flow.

**Deletion / cleanup.** DB FK cascade removes `service → deployments → logs`. Redis logs are purged on **deployment delete** and **service delete**. On service delete, `deleteServiceUseCase` also tears down the service's Docker footprint via `ServiceFootprintRepository.remove(service)` (best-effort per-resource: force-removes labeled containers + compose networks + images built for that project as `${projectName}_*`, **keeping shared pulled images**), then purges each deployment's Redis logs.

**Server maintenance & readiness.** `ServerPrunerRepository` prunes images/volumes/stopped-containers (`PruneResult`). A separate `OrphanContainersRepository` force-removes Artifactory compose-labeled containers whose project matches no existing service (`OrphanRemovalResult`). The controller maps a daemon-unreachable error to `503` with a local-dev hint. The feature also exposes a **public readiness probe** — `GET /server/readiness` — that actively checks the critical dependencies (PostgreSQL, Redis, Docker daemon) in parallel via a `HealthProbe` port per dependency. Each probe is reported `up`/`down` (a throw counts as `down`, never rejecting the aggregate); the endpoint returns `200` with the per-dependency breakdown when all are up, or `503` carrying the same breakdown when any is down.

**Read-only Docker features.** `containers` and `networks` list a service's running containers / compose networks by label; `providers` (GitHub App) lists repos/branches, resolves head commits, and fetches source archives. None use the DB.

## Module wiring

- `AppModule` imports `CoreModule` + every feature module, and provides the app-wide cross-cutting bindings: the **global exception filter** (`APP_FILTER`) and the **global rate-limit guard** (`APP_GUARD`, `ThrottlerGuard`). The **global auth guard** (`JwtAuthGuard`, a second `APP_GUARD`) is provided by the authentication module. Note: the exception filter is wired here in `AppModule`, not in `CoreModule`.
- `services` ↔ `deployments` resolve their mutual dependency via `forwardRef` on both sides. `deployments` imports `logs`, `providers`, `services` and exports its DB repository + queue.
- **`@Global() CoreModule`** provides shared, dependency-free infrastructure injectable everywhere without importing a feature: root TypeORM config, `DockerClient` (lazy Dockerode over **TLS** to the VPS/DinD daemon, reads certs from `VPS_DOCKER_CERT_PATH`, 503 if missing), `RedisClient`, `DiagnosticLoggerService` (thin `Logger` wrapper), and a docker controller. Env validation runs at bootstrap.

### Cross-cutting concerns

Beyond the per-feature layering, four app-wide concerns are configured once at the root:

- **Authentication** — a global JWT guard makes every route auth-by-default (see above).
- **Rate limiting** — `ThrottlerModule` defines two named throttlers configured from env: `default` (applied globally) and `stream` (for long-lived SSE). Endpoints tune it locally: login uses a strict `@Throttle` (5 requests / 60s) to blunt brute force, and the log-stream endpoint uses `@SkipThrottle` on `default` plus `@Throttle` on `stream` so a persistent connection is not counted against the normal budget.
- **Security headers** — `helmet()` is applied globally at bootstrap.
- **Env validation** — a class-validator schema validates all configuration at boot and **fails fast** on any missing/invalid var (DB, Redis, GitHub App, VPS Docker TLS, CORS, throttling, and JWT settings). No silent fallbacks.
- **Error envelope** — the global exception filter returns a consistent JSON shape (`statusCode`, `message`, `error`, `timestamp`, `path`), preserves `ValidationPipe` message arrays, and collapses unexpected errors into a generic 500 (no internal leakage). 5xx are logged with a stack trace, 4xx at warn.

## Conventions

- **JSDoc:** one-line block on every export; fuller `@param`/`@returns` on repos, services, and use cases. Mirror the existing style of the same file type.
- **Naming:** models `<Entity>` in `models/<entity>.model.ts`; ports `<Feature>Repository`; entities `…DbEntity`; adapters `…DatabaseRepository`; use cases `<verb>-<entity>.use-case.ts` → `<verb><Entity>UseCase`; tables plural snake_case.
- **Path aliases** (`apps/backend/tsconfig.json`): `@core/*` → `./src/core/*`, `@features/*` → `./src/features/*`. Use them for cross-feature/core imports; relative paths within a feature.

## Scripts (`apps/backend/package.json`)

`dev` (`nest start --watch`), `build` (`nest build`), `start` / `start:prod`, `lint` (`eslint .`), `test` (`jest`), `test:e2e`.
