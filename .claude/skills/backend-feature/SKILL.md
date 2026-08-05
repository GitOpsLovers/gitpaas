---
name: backend-feature
description: Scaffold a new feature in the Backend application (apps/backend) following the project's layered architecture. Use when adding a new resource/entity to the backend.
---

# Backend feature skill

Procedure for adding a feature to `apps/backend`.

## First, read the architecture

**Read `docs/backend-architecture.md` before writing anything.** It is the source of truth for the layers, the port/adapter DI pattern, transformers, persistence, validation, HTTP/REST conventions, naming, and JSDoc. This skill only gives the procedure and what the doc leaves to convention.

Mirror the **`projects`** feature (`apps/backend/src/features/projects/`) — the reference CRUD implementation. Fastest path: copy its files and rename `project`/`Project` → your entity.

## Procedure

Build bottom-up (inner layers first) under `apps/backend/src/features/<feature>/`:

1. **domain** — `models/<entity>.models.ts` (plain interfaces; the `.models.ts` suffix is plural even for one type), `dtos/{create,update}-<entity>.dto.ts` (class-validator, `!` assertion), `repositories/<feature>.repository.ts` (the `<Feature>Repository` port). Add `ports/<collaborator>.port.ts` only when the feature needs a non-collection collaborator, and `errors/<feature>.errors.ts` only when it raises domain errors.
2. **infrastructure** — `database/<entity>-db.entity.ts` (`@Entity('<plural_snake_case>')`, `…DbEntity`, UUID PK), `database/<feature>-db.transformer.ts` (plain `to<Entity>(entity)` functions), `database/<feature>-db.repository.ts` (`<Feature>DatabaseRepository implements <Feature>Repository`, returns domain models via the transformer). Sub-folders are named after the technology (`database`, `docker`, `redis`, `github`, …).
3. **application** — one `<verb>-<entity>.use-case.ts` pure function per operation, exported as `<verb><Entity>UseCase`, receiving ports as params. No file in `application/` may use any other suffix.
4. **ui** — `services/<feature>.service.ts` (DI bridge; injects the concrete repo by class, delegates to use cases) and `controllers/<feature>.controller.ts` (`@Controller('<feature>')`, thin, `ParseUUIDPipe` on `:id`, `NotFoundException` on `null`).
5. **module** — `<feature>.module.ts`: `TypeOrmModule.forFeature([<Entity>DbEntity])`, the controller, and `[<Feature>Service, <Feature>DatabaseRepository]` as providers.
6. **register** — add the module to `imports` in `apps/backend/src/app.module.ts` (import via `@features/<feature>/<feature>.module`).

## Naming (get this right or the feature is wrong)

Layer folders are singular (`domain`, `application`, `infrastructure`, `ui`). Folders inside them are plural nouns naming the **kind of artefact**, never the subject matter. The domain layer has exactly five possible folders — `models/`, `dtos/`, `repositories/`, `ports/`, `errors/`. Never create a sixth (no `domain/security/`, `domain/queues/`, `domain/executors/`).

**`repositories/` vs `ports/`** — the one rule scaffolding gets wrong:

- `repositories/<feature>.repository.ts` → interface `<Feature>Repository`. **Aggregate collections only**: `findById` / `getAll` / `save` / `delete` over an entity this feature owns.
- `ports/<collaborator>.port.ts` → interface named for the concept with **no suffix** (`LogStore`, `HealthProbe`, `DockerExecutor`, `DeploymentQueue`). Everything else: gateways, executors, queues, hashers, probes, pruners, stores.

**Infrastructure implementations** put the domain concept first in both the file and the class name:

| Implements                | File                                   | Class                            |
|---------------------------|----------------------------------------|----------------------------------|
| a `repositories/` interface | `<feature>-<technology>.repository.ts` | `<Feature><Technology>Repository` |
| a `ports/` interface        | `<port>-<technology>.adapter.ts`       | `<Port><Technology>Adapter`       |

e.g. `logs/infrastructure/redis/log-store-redis.adapter.ts` → `LogStoreRedisAdapter`. In file names the `database` technology is abbreviated `db` (`projects-db.repository.ts` → `ProjectsDatabaseRepository`).

Infrastructure sub-folders are named after the technology/vendor (`database`, `docker`, `redis`, `github`, `passport`, `cli`). Escape hatch: an adapter with no vendor — an in-process decorator or composite — goes in a folder named after the port instead (`features/logs/infrastructure/log-store/`).

No central entity list: entities auto-load, and in dev/test `synchronize` creates tables automatically. Production, however, has `synchronize` off and its schema lives in plain SQL files under `iac/production/migrations/` (applied by `scripts/install.sh`, not by the backend, which ships no migration machinery). So **adding or changing an entity requires a hand-written `.sql` migration**: add `iac/production/migrations/NNN_short_description.sql` with the next free number, idempotent SQL, and the exact column types, defaults and constraint names TypeORM expects, and commit it with your change. See the "Schema management" section of `docs/backend-architecture.md` and `iac/production/migrations/README.md`.

## Authentication (auth by default)

A global `JwtAuthGuard` is registered as `APP_GUARD` (in the `authentication` feature), so **every route is protected by default**. A new controller or endpoint automatically requires a valid Bearer access token — you do **not** wire any guard per feature.

- **Public endpoints:** annotate the handler (or controller) with `@Public()` from the `authentication` feature's `ui/decorators` only for routes that must be reachable without a token (e.g. health/readiness, the auth login/refresh/logout endpoints).
- **Reading the caller:** use the `@CurrentUser()` decorator (same `ui/decorators`) to access the authenticated user in a handler.
- **Rate limiting:** a global `ThrottlerGuard` also applies. Use `@Throttle({...})` to tighten a limit (e.g. login) or `@SkipThrottle`/a named throttler for special traffic such as SSE streams.
- **Authorization:** the `role` field on users is persisted but no RBAC guard is enforced yet — every authenticated user has equal access. Do not assume role checks exist.

## Transformers (mandatory)

Repos **always return domain models**, never raw ORM/vendor shapes. In the sibling `<stem>.transformer.ts`, export **plain functions** `to<Entity>(entity): <Entity>` (persistence → domain); add the reverse as another function in the same file if writes need it. The repo imports and uses them (`rows.map(toEntity)`).

## Associations (foreign keys)

When the entity belongs to a parent:

- On the entity: `@Column('uuid') public <parent>Id!: string;` plus `@ManyToOne(() => ParentDbEntity, { onDelete: 'CASCADE' }) @JoinColumn({ name: '<parent>Id' })`. Import the parent entity via its `@features/...` alias.
- Cascade keeps referential integrity (deleting the parent removes children).
- Put the FK in the create DTO (`@IsUUID`); keep it out of the update DTO if the association is immutable.
- To scope the list by parent: repo `getAllBy<Parent>(<parent>Id)` + controller `@Query('<parent>Id', ParseUUIDPipe)`.

## Verify

- Do **not** run ESLint (user's responsibility) and do not install deps.
- Confirm it compiles: `pnpm --filter backend build`.
