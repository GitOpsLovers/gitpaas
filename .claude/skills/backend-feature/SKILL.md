---
name: backend-feature
description: Scaffold a new feature in the Backend application (apps/backend) following the project's layered architecture. Use when adding a new resource/entity to the backend.
---

# Backend feature skill

The step-by-step procedure for adding a feature to `apps/backend`.

## First, read the architecture

**Read `docs/backend-architecture.md` before writing anything.** It is the source of truth for the layers, the repository port/DI pattern, persistence, validation, HTTP/REST conventions, naming, and JSDoc. This skill does not repeat it — it only gives the procedure and the few things the doc leaves to convention.

Then mirror the **`projects`** feature (`apps/backend/src/features/projects/`) — it is the reference implementation. The fastest, most reliable path is to copy its files and rename `project`/`Project` → your entity.

## Procedure

Create files bottom-up (inner layers first) under `apps/backend/src/features/<feature>/`:

## 

1. **domain** — `models/<entity>.model.ts` (plain interface), `dtos/create-<entity>.dto.ts` + `dtos/update-<entity>.dto.ts` (class-validator classes), `repositories/<feature>.repository.ts` (the `<Feature>Repository` port).
2. **infrastructure** — `database/<entity>-db.entity.ts` (`@Entity('<plural_snake_case>')`, `…DbEntity`), `database/<feature>-db.transformer.ts` (a sibling file exporting plain `to<Entity>(entity)` mapping functions — see below), and `database/<feature>-db.repository.ts` (`…DatabaseRepository implements <Feature>Repository`) that imports those functions and returns domain models through them.
3. **application** — one `<verb>-<entity>.use-case.ts` pure function per operation.
4. **ui** — `services/<feature>.service.ts` (DI bridge, delegates to use cases) and `controllers/<feature>.controller.ts` (`@Controller('<feature>')`).
5. **module** — `<feature>.module.ts` with `TypeOrmModule.forFeature([<Entity>DbEntity])`, the controller, and `[<Feature>Service, <Feature>DatabaseRepository]` as providers.
6. **register** — add the module to `imports` in `apps/backend/src/app.module.ts` (import via `@features/<feature>/<feature>.module`).

No migrations and no central entity list: entities auto-load and `synchronize` creates the table in non-production.

## Transformers (mandatory)

Infra repositories **always return domain models**, never raw ORM entities (or external-API/Redis shapes). The mapping lives in a **sibling transformer file** next to the repository:

- Create `database/<feature>-db.transformer.ts` (name it after the repository's file stem: `<stem>.transformer.ts`, sibling to `*.repository.ts` / `*.provider.ts`).
- Export **plain functions**, not classes, static methods, or providers: `to<Entity>(entity): <Entity>` mapping persistence → domain. If the repo also needs domain → persistence for writes, add that as **another function in the same file**.
- The repository imports these and uses them (`rows.map(toEntity)`, `toEntity(row)`) instead of returning entities or mapping inline.

## Associations (foreign keys)

When the entity belongs to another (e.g. a service belongs to a project):

- On the entity, add `@Column('uuid') public <parent>Id!: string;` plus a `@ManyToOne(() => ParentDbEntity, { onDelete: 'CASCADE' }) @JoinColumn({ name: '<parent>Id' })` relation. Import the parent entity via its `@features/...` alias.
- `onDelete: 'CASCADE'` keeps referential integrity (deleting the parent removes children).
- Put the FK id in the create DTO (validated with `@IsUUID`); keep it out of the update DTO if the association is immutable.
- To scope the list by parent: repository `getAllBy<Parent>(<parent>Id)` + controller `@Query('<parent>Id', ParseUUIDPipe)`.

## Verify

- Do **not** run ESLint — that is the user's responsibility.
- Confirm it compiles: `pnpm --filter backend build`.
- For now, don't implement tests.
