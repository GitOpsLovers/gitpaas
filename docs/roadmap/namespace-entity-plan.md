# Namespace entity plan — group projects into namespaces

This document is an **implementation proposal**. Nothing in it is implemented yet. It gives a plan to add a
**namespace** entity to GitPaaS. A namespace is a new top-level grouping that holds one or more projects, so an
operator can organise projects into separate scopes (for example, one namespace per team or per environment)
instead of keeping every project in one flat list. Today GitPaaS has no way to group projects at all — a
project is already the top grouping, and it groups services directly. This plan solves that gap. It answers
GitHub issue [#53 — "feat: add namespace entity"](https://github.com/GitOpsLovers/gitpaas/issues/53).

For the layers and the conventions that the plan obeys, see [backend architecture](../backend-architecture.md)
and [frontend architecture](../frontend-architecture.md). For the scaffolding procedure, see the
`backend-feature` skill (`.claude/skills/backend-feature/SKILL.md`). For the house format of a plan document,
see [the request-model plan](./request-model-plan.md).

---

## 1. Context and current state

### 1.1 The grouping hierarchy today

A project is the top grouping. It groups services, and a service is the thing that gets deployed (its
repository, its branch and its compose file). The domain model is:

```ts
// apps/backend/src/features/projects/domain/models/project.models.ts
export interface Project {
    id: string;
    name: string;
    servicesCount?: number;
}
```

A project has no owner and no scope above it. `GET /api/v1/projects` (`ProjectsController.getAll`, in
`apps/backend/src/features/projects/ui/controllers/projects.controller.ts`) returns every project in the
install, with no filter. The database enforces no uniqueness on the project `name` — two projects can be named
`api` today, and the frontend list (`apps/frontend/src/app/features/projects/ui/containers/projects-list/`)
shows all of them together.

### 1.2 The reference feature this plan mirrors

The `projects` feature is the canonical example of a top-level entity in both applications, and this plan
copies its shape:

- Backend: `apps/backend/src/features/projects/{application,domain,infrastructure,ui}/` and
  `projects.module.ts`, registered in `apps/backend/src/app.module.ts`.
- Frontend: `apps/frontend/src/app/features/projects/{domain,infrastructure,ui}/`, the page shells in
  `apps/frontend/src/app/pages/projects/`, and the routes in `apps/frontend/src/app/app.routes.ts`.

The child-of-parent relation that a namespace needs on a project already exists one level down, between a
service and its project, and this plan copies that shape too:

```ts
// apps/backend/src/features/services/infrastructure/database/db-service.entity.ts
@Entity('services')
export class DbServiceEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column()
    public name!: string;

    @Column('uuid')
    public projectId!: string;

    // ...service-only columns omitted...

    @ManyToOne(() => DbProjectEntity, (project) => project.services, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'projectId' })
    public project?: DbProjectEntity;
}
```

`DbProjectEntity` (`apps/backend/src/features/projects/infrastructure/database/db-project.entity.ts`) holds the
matching `@OneToMany(() => DbServiceEntity, ...)`. A namespace needs the same pair of relations, one level up.

---

## 2. Decisions, and why

The repository owner already made six decisions. This plan states them as fixed requirements.

### 2.1 Membership is mandatory

Every project must belong to exactly one namespace. The `namespaceId` column on `projects` is `NOT NULL`, and a
migration creates one `default` namespace and attaches every existing project to it before the column becomes
`NOT NULL`.

**Why.** A project with no namespace would need a nullable relation and a "no namespace" case in every screen
and every query that groups by namespace. Mandatory membership keeps the model simple: a namespace always has a
well-defined set of projects, and a project always has exactly one owner. Because the install already has
projects, the migration must not orphan them — it gives them a home first (the `default` namespace), then locks
the column.

### 2.2 Deleting a namespace that still holds projects is refused

`DELETE /api/v1/namespaces/:id` answers `409 Conflict` when the namespace still has projects attached. The
error names how many projects block the deletion. The operator must move or delete those projects first.

**Why.** Deleting a namespace with projects in it is only safe if the projects go somewhere. GitPaaS has no
"move project to another namespace" step yet, and even if it did, a silent cascade would delete every service
and every deployment under those projects — the same reasoning that keeps `PROJECT_NOT_FOUND` a checked case
today. The pattern is the existing domain-error one: a `DomainError` subclass in
`apps/backend/src/features/projects/domain/errors/project.errors.ts`,

```ts
export class ProjectNotFoundError extends DomainError {
    constructor(projectId: string, options?: ErrorOptions) {
        super('PROJECT_NOT_FOUND', `Project ${projectId} not found`, options);
    }
}
```

translated to an HTTP exception by the single map in
`apps/backend/src/core/ui/translators/http-error.translator.ts`:

```ts
const DOMAIN_ERROR_TRANSLATIONS = new Map<string, DomainErrorTranslation>([
    ['PROJECT_NOT_FOUND', (error) => new NotFoundException(error.message, { cause: error })],
    // ...
]);
```

`AllExceptionsFilter` (`apps/backend/src/core/ui/filters/all-exceptions.filter.ts`) then reads the `cause` and
publishes the domain `code` on the wire. Section 4 gives the new error and its `NAMESPACE_NOT_EMPTY` code, which
the plan adds to the same map with a `ConflictException` (a translation the map does not use today).

### 2.3 A project name is unique inside its namespace, not across the install

Two namespaces may each hold a project named `api`. The database enforces this with a **composite unique
constraint** on `(namespaceId, name)` in the `projects` table, the same way `services` enforces its `projectId`
foreign key today. The API reports a violation as `409 Conflict` with a stable code
(`PROJECT_NAME_TAKEN`), following the persistence-error mapping already used for a foreign-key violation:

```ts
// apps/backend/src/features/services/infrastructure/database/db-services.transformer.ts
const FOREIGN_KEY_VIOLATION = '23503';

export function toServicePersistenceError(error: unknown, projectId: string): unknown {
    if (readSqlState(error) === FOREIGN_KEY_VIOLATION) {
        return new ProjectNotFoundError(projectId, { cause: error });
    }

    return error;
}
```

The `projects` transformer gains the same kind of function, reading the PostgreSQL `unique_violation` code
(`23505`) instead of `23503`, and mapping it to a new `ProjectNameTakenError`.

**Why.** A global unique name is a naming collision waiting to happen the day a second team joins the install.
Scoping the constraint to the namespace matches the mental model of section 1: the namespace is the scope, so
uniqueness lives at the scope. Enforcing it in the database, and not only in application code, keeps the rule
true even under a race between two concurrent requests — the database is the single point that can see both at
once.

### 2.4 Scope is backend and frontend

The feature is not complete until an operator can create a namespace, assign a project to it and see the
projects of a namespace, in the UI. Sections 5 and 6 give the backend and the frontend work.

### 2.5 Every project operation nests under its namespace

`/api/v1/namespaces/:namespaceId/projects` and `/api/v1/namespaces/:namespaceId/projects/:id` replace the flat
`/api/v1/projects` routes. All five project operations move under the namespace path:

- `GET    /namespaces/:namespaceId/projects`
- `POST   /namespaces/:namespaceId/projects`
- `GET    /namespaces/:namespaceId/projects/:id`
- `PUT    /namespaces/:namespaceId/projects/:id`
- `DELETE /namespaces/:namespaceId/projects/:id`

**Why.** Decision 2.1 makes namespace membership mandatory, so a project never exists without a namespace. The
nested path states that fact in the URL: a project is reached only through its namespace. This replaces, and
does not sit alongside, the flat `/projects` routes — a resource keeps one canonical path, and a second, flat
path would let a caller address a project with no namespace context, which decision 2.1 no longer allows. This
is a breaking change to the HTTP contract: every existing caller of `/api/v1/projects` moves to the nested path
in the same pull request, and section 6 gives the matching frontend change. Unlike a service, which stays
reachable through the flat `/services?projectId=` filter (section 1.2), a project becomes the first resource of
the API that is only reachable through its parent's path — the `projects` feature stops being a second
reference shape for "a flat, filterable list" and becomes the reference shape for "a strictly owned child".

The controller validates both path segments with `ParseUUIDPipe`. The two identifiers must also agree: a
request for `/namespaces/A/projects/:id` where the project's real `namespaceId` is `B` answers `404`, not `200`
— the project is not reachable through a namespace it does not belong to. Section 5 places this check inside
the use case (`findProjectByIdUseCase`, `updateProjectUseCase`, `deleteProjectUseCase`), not the controller, so
the rule is written and tested once. The check raises the existing `ProjectNotFoundError` of decision 2.2 — a
namespace mismatch is treated exactly like a missing `id`, because from the caller's point of view, under this
namespace, the project does not exist. No new error class or translator entry is needed for this rule.

### 2.6 A namespace name is unique across the install

`namespaces.name` carries a unique constraint, at the column level.

**Why.** A namespace is the top grouping and it has no parent to scope it, unlike a project name, which decision
2.3 scopes to its namespace. Two namespaces both named `default` would make the namespace list of the frontend
ambiguous, and would make the backfill of the migration in section 4 undefined, because the backfill looks up
the `default` namespace by name. Section 3.3 and section 4 give the constraint and its migration statement.

---

## 3. Data model

### 3.1 The `Namespace` domain model

New file, `apps/backend/src/features/namespaces/domain/models/namespace.models.ts`:

```ts
/**
 * A namespace is the entity used to group projects under one scope.
 */
export interface Namespace {
    id: string;
    name: string;
    projectsCount?: number;
}
```

This mirrors `Project` exactly (`id`, `name`, and an optional derived count), because a namespace plays the same
grouping role for projects that a project plays for services.

### 3.2 The change to `Project`

`apps/backend/src/features/projects/domain/models/project.models.ts` gains the required foreign key:

```ts
export interface Project {
    id: string;
    name: string;
    namespaceId: string;
    servicesCount?: number;
}
```

`namespaceId` is not on either DTO. Decision 2.5 puts it on the URL path instead, so `CreateProjectDto`
(`apps/backend/src/features/projects/domain/dtos/create-project.dto.ts`) and `UpdateProjectDto`
(`apps/backend/src/features/projects/domain/dtos/update-project.dto.ts`) both stay name-only:

```ts
export class CreateProjectDto {
    @IsString()
    @IsNotEmpty()
    public name!: string;
}
```

```ts
export class UpdateProjectDto {
    @IsString()
    @IsNotEmpty()
    public name!: string;
}
```

The controller reads the `:namespaceId` path segment separately (section 5) and passes it to the use case
alongside the DTO; a project cannot move to a different namespace in this release (see the Risks section).

### 3.3 The TypeORM entities

New file, `apps/backend/src/features/namespaces/infrastructure/database/db-namespace.entity.ts`:

```ts
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { DbProjectEntity } from '@features/projects/infrastructure/database/db-project.entity';

@Entity('namespaces')
export class DbNamespaceEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column({ unique: true })
    public name!: string;

    @OneToMany(() => DbProjectEntity, (project) => project.namespace)
    public projects?: DbProjectEntity[];
}
```

The `unique: true` column option is the same shape `DbUserEntity.email`
(`apps/backend/src/features/users/infrastructure/database/db-user.entity.ts`) already uses for a single-column
constraint. It enforces decision 2.6.

`apps/backend/src/features/projects/infrastructure/database/db-project.entity.ts` gains the required relation
and the composite unique index:

```ts
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { DbNamespaceEntity } from '@features/namespaces/infrastructure/database/db-namespace.entity';
import { DbServiceEntity } from '@features/services/infrastructure/database/db-service.entity';

@Entity('projects')
@Unique('UQ_projects_namespaceId_name', ['namespaceId', 'name'])
export class DbProjectEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column()
    public name!: string;

    @Column('uuid')
    public namespaceId!: string;

    @ManyToOne(() => DbNamespaceEntity, (namespace) => namespace.projects, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'namespaceId' })
    public namespace?: DbNamespaceEntity;

    @OneToMany(() => DbServiceEntity, (service) => service.project)
    public services?: DbServiceEntity[];
}
```

The relation to `namespace` uses `onDelete: 'RESTRICT'`, not `'CASCADE'` — the opposite choice from
`DbServiceEntity.project`. This is the database-level backstop for decision 2.2: even if a future code path
deletes a namespace row directly, PostgreSQL itself refuses the delete while a project still references it.

---

## 4. Database migration

The newest file in `iac/production/migrations/` is `008_deployment_queue_parent_request_id.sql`. This plan adds
`009_namespaces.sql`, following the style of `004_projects_services.sql` (hand-written SQL, `IF NOT EXISTS` on
every `CREATE TABLE`, a `DO $$ ... END $$;` guard around every `ALTER TABLE ... ADD CONSTRAINT`, so the file is
safe to run twice by hand and not only through the installer's `schema_migrations` ledger — see
`scripts/install.sh`, `run_migrations`, which wraps each file in one transaction and records its filename once
it commits). The plan is the ordered list of statements, not a finished script:

1. `CREATE TABLE IF NOT EXISTS "namespaces" (...)` — `id uuid DEFAULT uuid_generate_v4()` primary key, `name
   character varying NOT NULL`. Same shape as the existing `CREATE TABLE IF NOT EXISTS "projects"` statement in
   `004_projects_services.sql`.
2. Add the unique constraint on `namespaces.name`, guarded the same way as the other constraints of this file
   and placed before the `default` row is inserted, so the guard is in force from the first row on:
   `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UQ_namespaces_name') THEN ALTER
   TABLE "namespaces" ADD CONSTRAINT "UQ_namespaces_name" UNIQUE ("name"); END IF; END $$;`. This enforces
   decision 2.6.
3. Insert the `default` namespace, guarded so a re-run does not duplicate it —
   `INSERT INTO "namespaces" ("name") SELECT 'default' WHERE NOT EXISTS (SELECT 1 FROM "namespaces" WHERE
   "name" = 'default');`. The `WHERE NOT EXISTS` guard already protects a re-run on its own, so the new unique
   constraint of step 2 changes nothing about this statement — it only stops a second, differently-guarded
   insert from ever creating a duplicate row.
4. `ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "namespaceId" uuid;` — nullable at first, so the column can
   be added on a table that already has rows.
5. Backfill: `UPDATE "projects" SET "namespaceId" = (SELECT "id" FROM "namespaces" WHERE "name" = 'default')
   WHERE "namespaceId" IS NULL;`. Every project that existed before this migration lands in `default`.
6. `ALTER TABLE "projects" ALTER COLUMN "namespaceId" SET NOT NULL;` — safe only after step 5 ran, which is why
   the statements stay in this order inside one transaction.
7. Add the foreign key, guarded like the existing `FK_939f1c7659751696307d7357711` in
   `004_projects_services.sql` (`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = ...)
   THEN ALTER TABLE "projects" ADD CONSTRAINT "FK_<generated>" FOREIGN KEY ("namespaceId") REFERENCES
   "namespaces"("id") ON DELETE RESTRICT ON UPDATE NO ACTION; END IF; END $$;`). `RESTRICT`, and not `CASCADE`,
   matches decision 2.2 and the entity of section 3.3.
8. Add the composite unique constraint, guarded the same way:
   `ALTER TABLE "projects" ADD CONSTRAINT "UQ_projects_namespaceId_name" UNIQUE ("namespaceId", "name");` inside
   the same `IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = ...)` guard.

The constraint names in steps 2, 7 and 8 must be the exact names TypeORM generates for the entities of section
3.3 (`synchronize` in development names them for you — read the generated name once and copy it into the SQL
file, the same rule the "Schema management" section of the backend architecture doc already states for every
schema change).

---

## 5. Backend work

New feature module, laid out layer by layer, following the `backend-feature` skill's bottom-up order (`domain`
→ `infrastructure` → `application` → `ui`):

```text
apps/backend/src/features/namespaces/
  domain/
    models/namespace.models.ts            — Namespace (section 3.1)
    dtos/create-namespace.dto.ts          — CreateNamespaceDto { name }
    dtos/update-namespace.dto.ts          — UpdateNamespaceDto { name }
    errors/namespace.errors.ts            — NamespaceNotFoundError, NamespaceNotEmptyError
    repositories/namespaces.repository.ts — NamespacesRepository port
  infrastructure/database/
    db-namespace.entity.ts                — DbNamespaceEntity (section 3.3)
    db-namespaces.repository.ts           — DatabaseNamespacesRepository (implements NamespacesRepository)
    db-namespaces.transformer.ts          — toNamespace(entity): Namespace
  application/
    get-all-namespaces.use-case.ts
    find-namespace-by-id.use-case.ts
    create-namespace.use-case.ts
    update-namespace.use-case.ts
    delete-namespace.use-case.ts          — the only one with logic beyond a repository call, see below
  ui/
    controllers/namespaces.controller.ts
    services/namespaces.service.ts
  namespaces.module.ts
```

`NamespacesRepository` mirrors `ProjectsRepository` (`getAll`, `findById`, `create`, `update`, `delete`) and
adds one read the delete use case needs: `countProjects: (id: string) => Promise<number>`.

`deleteNamespaceUseCase` is the one use case that is not a thin pass-through, because decision 2.2 needs a
count before it can refuse:

```ts
export async function deleteNamespaceUseCase(repository: NamespacesRepository, id: string): Promise<boolean> {
    const projectsCount = await repository.countProjects(id);

    if (projectsCount > 0) {
        throw new NamespaceNotEmptyError(id, projectsCount);
    }

    return repository.delete(id);
}
```

`NamespaceNotEmptyError` follows the `ProjectNotFoundError` shape of section 2.2, with the count in the
message: `super('NAMESPACE_NOT_EMPTY', \`Namespace ${id} still has ${projectsCount} project(s) attached\`,
options)`. The `RESTRICT` foreign key of section 3.3 is the backstop for the race between this count and a
concurrent project creation; the count is the friendly path that names a number, the constraint is the
guarantee that never lets a namespace with projects disappear.

`namespaces.module.ts` follows `projects.module.ts` exactly (`TypeOrmModule.forFeature([DbNamespaceEntity])`,
the controller, the service, the concrete repository as a provider), and is registered in the `imports` array
of `apps/backend/src/app.module.ts`, next to `ProjectsModule`.

**New HTTP endpoints**, under `/api/v1/namespaces`:

| Method   | Path                | Body                 | Response          | Failure                                    |
|----------|----------------------|----------------------|--------------------|---------------------------------------------|
| `GET`    | `/namespaces`        | —                     | `Namespace[]`      | —                                            |
| `GET`    | `/namespaces/:id`    | —                     | `Namespace`        | `404` when not found                         |
| `POST`   | `/namespaces`        | `CreateNamespaceDto`  | `Namespace`        | —                                            |
| `PUT`    | `/namespaces/:id`    | `UpdateNamespaceDto`  | `Namespace`        | `404` when not found                         |
| `DELETE` | `/namespaces/:id`    | —                     | `204` (no body)    | `404` when not found, `409` when not empty   |

**Changes inside the existing `projects` feature**, driven by decision 2.5:

`ProjectsController` moves to `@Controller('namespaces/:namespaceId/projects')`. Its five HTTP endpoints:

| Method   | Path                                          | Body               | Response          | Failure                                       |
|----------|-----------------------------------------------|--------------------|--------------------|------------------------------------------------|
| `GET`    | `/namespaces/:namespaceId/projects`           | —                  | `Project[]`        | —                                                |
| `POST`   | `/namespaces/:namespaceId/projects`           | `CreateProjectDto` | `Project`          | `409` on a duplicate name inside the namespace   |
| `GET`    | `/namespaces/:namespaceId/projects/:id`       | —                  | `Project`          | `404` when not found or owned by another namespace |
| `PUT`    | `/namespaces/:namespaceId/projects/:id`       | `UpdateProjectDto` | `Project`          | `404` (as above), `409` on a duplicate name      |
| `DELETE` | `/namespaces/:namespaceId/projects/:id`       | —                  | `204` (no body)    | `404` (as above)                                 |

- `domain/models/project.models.ts` — unchanged from section 3.2: `Project` still carries the required
  `namespaceId`, because a project always belongs to exactly one namespace (decision 2.1); only the DTOs lose
  the field, because the path now carries it.
- `domain/dtos/create-project.dto.ts`, `domain/dtos/update-project.dto.ts` — section 3.2: both stay name-only.
- `domain/errors/project.errors.ts` — add `ProjectNameTakenError` (`PROJECT_NAME_TAKEN`), for decision 2.3. No
  other error class is added: the namespace-mismatch check of decision 2.5 reuses `ProjectNotFoundError`.
- `domain/repositories/projects.repository.ts` — `getAll` takes a required `namespaceId`:
  `getAll: (namespaceId: string) => Promise<Project[]>`, because every list is now scoped by the path.
- `application/create-project.use-case.ts` — `createProjectUseCase` takes the path `namespaceId` as a
  parameter, separate from the DTO, and merges the two before it calls `repository.create`:

  ```ts
  export function createProjectUseCase(
      repository: ProjectsRepository,
      namespaceId: string,
      createDto: CreateProjectDto,
  ): Promise<Project> {
      return repository.create({ ...createDto, namespaceId });
  }
  ```

- `application/find-project-by-id.use-case.ts`, `update-project.use-case.ts`, `delete-project.use-case.ts` —
  each of these three use cases now takes the path `namespaceId` as a parameter, fetches the project first, and
  raises `ProjectNotFoundError` when it does not exist or when `project.namespaceId` does not equal the given
  `namespaceId` (decision 2.5):

  ```ts
  export async function updateProjectUseCase(
      repository: ProjectsRepository,
      namespaceId: string,
      id: string,
      updateDto: UpdateProjectDto,
  ): Promise<Project> {
      const project = await repository.findById(id);

      if (!project || project.namespaceId !== namespaceId) {
          throw new ProjectNotFoundError(id);
      }

      return repository.update(id, updateDto);
  }
  ```

  `findProjectByIdUseCase` and `deleteProjectUseCase` follow the same shape (fetch, compare, throw, then act).
  `UpdateProjectDto` carries no `namespaceId`, so this use case never moves a project between namespaces — see
  the Risks section.
- `infrastructure/database/db-project.entity.ts` — section 3.3.
- `infrastructure/database/db-projects.repository.ts` — `getAll` always applies a `where: { namespaceId }`
  clause, following the `getAllByProject` shape already used by
  `apps/backend/src/features/services/infrastructure/database/db-services.repository.ts`. `create` and
  `update` catch the persistence error and rethrow through the new transformer function below.
- `infrastructure/database/db-projects.transformer.ts` — add `toProjectPersistenceError(error, namespaceId,
  name)`, reading `unique_violation` (`23505`) the same way `toServicePersistenceError` reads
  `foreign_key_violation` (`23503`) today, and returning a `ProjectNameTakenError`.
- `ui/controllers/projects.controller.ts` — every method reads `@Param('namespaceId', ParseUUIDPipe)
  namespaceId: string`; the id-bearing methods also read `@Param('id', ParseUUIDPipe) id: string`. Because
  `findProjectByIdUseCase`, `updateProjectUseCase` and `deleteProjectUseCase` now throw `ProjectNotFoundError`
  themselves, every method wraps its use case call in `try { ... } catch (error) { throw translateError(error);
  }`, the pattern `ServicesController.create` already uses for `translateError`. The controller drops the
  inline `if (!project) throw new NotFoundException(...)` checks it uses today — the use case is now the one
  place that decides "not found", so the rule is written and tested once, as decision 2.5 requires.
- `apps/backend/src/core/ui/translators/http-error.translator.ts` — add three entries to
  `DOMAIN_ERROR_TRANSLATIONS`: `NAMESPACE_NOT_FOUND` → `NotFoundException`, `NAMESPACE_NOT_EMPTY` →
  `ConflictException`, `PROJECT_NAME_TAKEN` → `ConflictException`. `ConflictException` is a new import in this
  file — it maps no code today. `PROJECT_NOT_FOUND` needs no new entry: it is already mapped, from decision 2.2,
  and the namespace-mismatch check of decision 2.5 reuses it.

---

## 6. Frontend work

New feature, mirroring `apps/frontend/src/app/features/projects/`:

```text
apps/frontend/src/app/features/namespaces/
  domain/
    models/namespace.model.ts             — Namespace (id, name, projectsCount?)
    dtos/create-namespace.dto.ts          — CreateNamespaceDto { name }
    dtos/update-namespace.dto.ts          — UpdateNamespaceDto { name }
  infrastructure/api/
    namespaces-api.repository.ts          — httpResource<Namespace[]> list, get-by-id, create/update/delete
  ui/components/
    namespace-card/                       — presentational card, mirrors project-card
    namespace-form/                       — presentational name form, mirrors project-form
  ui/containers/
    namespaces-list/                      — smart container, mirrors projects-list
    namespace-add/                        — smart container, mirrors project-add
    namespace-edit/                       — smart container, mirrors project-edit
```

`namespaces-api.repository.ts` copies `apps/frontend/src/app/features/projects/infrastructure/api/
projects-api.repository.ts` field for field: an `@Injectable()` class with an `httpResource<Namespace[]>` list
resource, a `namespaceById` resource factory, and `create` / `update` / `delete` methods returning an
`Observable`.

**New page shells**, under `apps/frontend/src/app/pages/namespaces/`, mirroring
`apps/frontend/src/app/pages/projects/{list,add,edit}/`:

```text
pages/namespaces/list/namespaces-list.component.ts   — NamespacesListPage
pages/namespaces/add/namespace-add.component.ts      — NamespacesAddPage
pages/namespaces/edit/namespace-edit.component.ts     — NamespacesEditPage
```

**Route changes**, in `apps/frontend/src/app/app.routes.ts`. The `namespaces` path stays a flat sibling of
today's route tree, because namespace CRUD is unaffected by decision 2.5. But the existing `projects` children
move inside it, because decision 2.5 makes every project route depend on `:namespaceId`:

```ts
{
    path: 'namespaces',
    children: [
        { path: '', loadComponent: () => import('@pages/namespaces/list/namespaces-list.component')
            .then((m) => m.NamespacesListPage), title: 'Namespaces | GitPaaS' },
        { path: 'add', loadComponent: () => import('@pages/namespaces/add/namespace-add.component')
            .then((m) => m.NamespacesAddPage), title: 'Add namespace | GitPaaS' },
        { path: 'edit/:id', loadComponent: () => import('@pages/namespaces/edit/namespace-edit.component')
            .then((m) => m.NamespacesEditPage), title: 'Edit namespace | GitPaaS' },
        {
            path: ':namespaceId/projects',
            children: [
                { path: '', loadComponent: () => import('@pages/projects/list/projects-list.component')
                    .then((m) => m.ProjectsListPage), title: 'Projects | GitPaaS' },
                { path: 'add', loadComponent: () => import('@pages/projects/add/project-add.component')
                    .then((m) => m.ProjectsAddPage), title: 'Add project | GitPaaS' },
                { path: 'edit/:id', loadComponent: () => import('@pages/projects/edit/project-edit.component')
                    .then((m) => m.ProjectsEditPage), title: 'Edit project | GitPaaS' },
                { path: ':id', loadComponent: () => import('@pages/projects/detail/project-detail.component')
                    .then((m) => m.ProjectDetailPage), title: 'Project | GitPaaS' },
                // ...the existing ':id/services/...' children move here unchanged...
            ],
        },
    ],
},
```

The former top-level `projects` path is removed, not kept alongside this one — the same "one canonical path"
rule of decision 2.5 applies to the frontend route as to the HTTP route. Because `app.config.ts` already
registers `withComponentInputBinding()`, `:namespaceId` (like `:id` today) binds directly to a `namespaceId`
input on each page and container, with no extra wiring.

**Changes to the existing project screens**, to satisfy decision 2.4 and decision 2.5:

- `apps/frontend/src/app/features/projects/domain/models/project.model.ts` — add `namespaceId: string`, mirror
  of section 3.2.
- `apps/frontend/src/app/features/projects/domain/dtos/create-project.dto.ts` — stays name-only, mirror of
  section 3.2: `namespaceId` is not on the DTO, because the route path carries it.
- `apps/frontend/src/app/features/projects/infrastructure/api/projects-api.repository.ts` — every URL gains the
  `namespaces/:namespaceId/` prefix. The repository exposes a `namespaceId = signal<string | undefined>
  (undefined)` that the container sets from its route input, and the `projects` resource, the `projectById`
  factory and the `create` / `update` / `delete` methods all build their URL from it:

  ```ts
  public readonly namespaceId = signal<string | undefined>(undefined);

  public readonly projects = httpResource<Project[]>(() =>
      this.namespaceId() ? `${this.baseUrl}/namespaces/${this.namespaceId()}/projects` : undefined);
  ```

  `create` and `update` no longer send `namespaceId` in the request body — it is already in the URL.
- `apps/frontend/src/app/features/projects/ui/containers/projects-list/projects-list.component.ts` — reads
  `namespaceId` from its route input (bound by `withComponentInputBinding()`) and sets
  `repository.namespaceId`, so the list is scoped by the route, not by an in-page filter. `ProjectCardComponent`
  stays presentational and unaware of namespaces.
- `apps/frontend/src/app/features/projects/ui/containers/project-add/project-add.component.ts` — reads
  `namespaceId` from its route input and passes it to `projectsApiRepository.create(namespaceId, { name })`. No
  namespace `<select>` is added: with the nested route, the namespace is fixed by the URL the operator is
  already on, so there is nothing to choose on this screen.
- `apps/frontend/src/app/features/projects/ui/containers/project-edit/project-edit.component.ts` — reads
  `namespaceId` and `id` from its route input and passes both to `projectsApiRepository.update(namespaceId, id,
  { name })`. No namespace `<select>` here either, and this plan adds no way to change a project's namespace
  from this screen (see the Risks section).
- `apps/frontend/src/app/features/projects/ui/components/project-form/project-form.component.ts` — unchanged:
  it stays name-only, `save = output<string>()`, exactly as it is today.

---

## 7. Testing

Every new file gets a spec beside it, in the sibling `__tests__` folder — the layout `apps/backend/src/features/
projects/{application,domain,infrastructure,ui}/__tests__/` already uses, and the `backend-unit-testing` skill
if the repository has one at the time of implementation.

**Backend:**

- `application/__tests__/*.use-case.spec.ts` — one spec per use case; `delete-namespace.use-case.spec.ts` is the
  one that needs two cases: `countProjects` returns `0` (delete proceeds) and returns `> 0` (throws
  `NamespaceNotEmptyError` with the count in the message, and never calls `repository.delete`).
- `domain/errors/__tests__/namespace.errors.spec.ts` — mirrors `project.errors.spec.ts`: constructs each error
  and asserts its `code` and `message`.
- `infrastructure/database/__tests__/db-namespaces.repository.spec.ts` and
  `db-namespaces.transformer.spec.ts` — mirror the `projects` equivalents; the transformer spec for `projects`
  additionally covers `toProjectPersistenceError`, asserting the `23505` case returns a
  `ProjectNameTakenError` and every other `SQLSTATE` (or no `SQLSTATE`) returns the original error unchanged —
  the same table-driven shape `db-services.transformer.spec.ts` already uses for `toServicePersistenceError`.
- `ui/controllers/__tests__/namespaces.controller.spec.ts` and `ui/services/__tests__/namespaces.service.spec.ts`
  — mirror the `projects` equivalents.
- `apps/backend/src/core/ui/translators/__tests__/http-error.translator.spec.ts` — add the three new code →
  exception cases of section 5.
- `apps/backend/src/features/projects/application/__tests__/find-project-by-id.use-case.spec.ts`,
  `update-project.use-case.spec.ts` and `delete-project.use-case.spec.ts` — for decision 2.5, add the
  namespace-mismatch case to each: `repository.findById` resolves a project whose `namespaceId` differs from
  the one given, and the use case throws `ProjectNotFoundError` without calling `update` or `delete`.
- `apps/backend/src/features/projects/ui/controllers/__tests__/projects.controller.spec.ts` — add the
  `namespaceId` and `id` path-parameter validation cases, and the `try`/`catch`/`translateError` path for all
  five methods.

**Frontend:**

- `namespaces-api.repository.spec.ts`, one spec per container (`namespaces-list`, `namespace-add`,
  `namespace-edit`), mirroring the existing `projects-api.repository.spec.ts` and the `projects` container
  specs.
- `projects-api.repository.spec.ts` — add the case that the `projects`, `projectById`, `create`, `update` and
  `delete` URLs all include the `namespaceId` set on the repository.

---

## 8. Delivery order

Each step leaves the repository working. Steps 1 and 2 can ship in one pull request; step 3 (the breaking
`projects` change) is its own pull request, because it changes an existing contract; step 4 is its own pull
request per the usual "one feature, one PR" split.

1. **Migration** (`009_namespaces.sql`, section 4). Adds the table, the `default` row, and the (still optional
   at the database level until step 3) groundwork. This step alone changes no application code and is safe to
   ship and apply ahead of the code that depends on it.
2. **Backend — `namespaces` feature** (section 5, the new module only). The API can create, list, read, update
   and delete namespaces. No existing endpoint changes yet, so this ships with no coordinated frontend change.
3. **Backend — `projects` changes** (section 5, "changes inside the existing `projects` feature") together with
   the migration's `NOT NULL` and constraint steps applied. This is the breaking change: the flat `/projects`
   routes are replaced by the nested `/namespaces/:namespaceId/projects` routes of decision 2.5. Ship it
   together with the frontend routing and repository change of section 6 in the same pull request, with no gap
   where a frontend build calls the removed, flat contract.
4. **Frontend — `namespaces` feature and the `projects` screen changes** (section 6). Can split into two pull
   requests if step 3 already shipped the backend route change: one for the new namespace screens, one for
   moving the project routes and repository under `:namespaceId`.

---

## 9. Risks

- A project cannot move between namespaces in this release, and section 2.2 refuses the deletion of a namespace
  that still holds projects. Thus an operator who wants to remove a namespace must delete its projects first. A
  move operation is the natural follow-up.
- **The installer upgrade path.** `009_namespaces.sql` runs automatically through `scripts/install.sh`'s
  `run_migrations` step on the next `install.sh` run against an existing install, because the ledger only skips
  files it already applied. No manual operator step is needed — but the backfill (step 5 of section 4) assumes
  every existing project fits into one `default` namespace, which is true today because there is no other
  namespace before this migration runs.
- **The TypeORM constraint-name rule.** Section 4 needs the exact constraint names TypeORM generates for
  `UQ_namespaces_name`, the projects-to-namespaces foreign key and `UQ_projects_namespaceId_name`. These names
  come from reading `synchronize` output in development and copying it into the SQL file by hand; a mismatch
  between the generated name and the hand-written one does not fail loudly — it only means a second, differently
  named constraint could slip in later. The "Schema management" section of the backend architecture doc already
  states this rule for every schema change, and this plan adds no new safeguard beyond following it carefully.
- **Telemetry.** `apps/backend/src/features/projects/ui/services/projects.service.ts` calls `enrichTelemetry({
  'project.id': project.id })` on create. The new `namespaces.service.ts` should do the same
  (`'namespace.id'`), and `projects.service.ts` should add `'namespace.id'` to its existing `create`/`update`
  telemetry, read from the `:namespaceId` path parameter its controller already validates — not a functional
  requirement, but consistent with the existing convention and worth doing in the same pull request as step 3.

---

## Related docs

- [Backend architecture](../backend-architecture.md)
- [Frontend architecture](../frontend-architecture.md)
- [Backend business](../backend-business.md)
- [Request model plan](./request-model-plan.md) — the house format this document follows
