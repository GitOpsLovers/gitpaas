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

1. **domain** — `models/<entity>.model.ts` (plain interface), `dtos/{create,update}-<entity>.dto.ts` (class-validator, `!` assertion), `repositories/<feature>.repository.ts` (the `<Feature>Repository` port).
2. **infrastructure** — `database/<entity>-db.entity.ts` (`@Entity('<plural_snake_case>')`, `…DbEntity`, UUID PK), `database/<feature>-db.transformer.ts` (plain `to<Entity>(entity)` functions), `database/<feature>-db.repository.ts` (`…DatabaseRepository implements <Feature>Repository`, returns domain models via the transformer).
3. **application** — one `<verb>-<entity>.use-case.ts` pure function per operation, exported as `<verb><Entity>UseCase`, receiving ports as params.
4. **ui** — `services/<feature>.service.ts` (DI bridge; injects the concrete repo by class, delegates to use cases) and `controllers/<feature>.controller.ts` (`@Controller('<feature>')`, thin, `ParseUUIDPipe` on `:id`, `NotFoundException` on `null`).
5. **module** — `<feature>.module.ts`: `TypeOrmModule.forFeature([<Entity>DbEntity])`, the controller, and `[<Feature>Service, <Feature>DatabaseRepository]` as providers.
6. **register** — add the module to `imports` in `apps/backend/src/app.module.ts` (import via `@features/<feature>/<feature>.module`).

No migrations, no central entity list: entities auto-load and `synchronize` creates tables in non-production.

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
