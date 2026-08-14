# Namespace entity plan — to-do list

For the detail behind each item, see [namespace entity plan](./namespace-entity-plan.md).

All the paths are relative to the root of the repository, if there is no other indication.

---

## Phase 1 — The migration

- [ ] Create `iac/production/migrations/009_namespaces.sql` (new) with the `CREATE TABLE IF NOT EXISTS "namespaces"` statement, following the shape of `004_projects_services.sql`.
- [ ] Add the guarded `UQ_namespaces_name` unique-constraint statement to `iac/production/migrations/009_namespaces.sql`, before the `default` row insert.
- [ ] Add the guarded `default` namespace insert statement to `iac/production/migrations/009_namespaces.sql`.
- [ ] Add the nullable `namespaceId` column, the backfill and the `NOT NULL` statements for `projects` to `iac/production/migrations/009_namespaces.sql`.
- [ ] Add the guarded foreign-key statement and the guarded `UQ_projects_namespaceId_name` composite unique-constraint statement for `projects` to `iac/production/migrations/009_namespaces.sql`.
- [ ] Read the constraint names TypeORM generates for the entities of phase 2 and phase 3, and copy the exact names into `iac/production/migrations/009_namespaces.sql`.
- [ ] Verify with `rtk pnpm run build` that the migration file changes nothing that fails the build.

## Phase 2 — Backend, the `namespaces` feature

- [ ] Create `apps/backend/src/features/namespaces/domain/models/namespace.models.ts` (new) with the `Namespace` interface.
- [ ] Create `apps/backend/src/features/namespaces/domain/dtos/create-namespace.dto.ts` and `update-namespace.dto.ts` (new) with the validated `name` field.
- [ ] Create `apps/backend/src/features/namespaces/domain/errors/namespace.errors.ts` (new) with `NamespaceNotFoundError` and `NamespaceNotEmptyError`.
- [ ] Create the spec `apps/backend/src/features/namespaces/domain/errors/__tests__/namespace.errors.spec.ts` (new) that asserts the `code` and the `message` of each error.
- [ ] Create `apps/backend/src/features/namespaces/domain/repositories/namespaces.repository.ts` (new) with the `getAll`, `findById`, `create`, `update`, `delete` and `countProjects` port methods.
- [ ] Create `apps/backend/src/features/namespaces/infrastructure/database/db-namespace.entity.ts` (new) with the unique `name` column and the `projects` relation.
- [ ] Create `apps/backend/src/features/namespaces/infrastructure/database/db-namespaces.transformer.ts` (new) with `toNamespace`.
- [ ] Create `apps/backend/src/features/namespaces/infrastructure/database/db-namespaces.repository.ts` (new) that implements `NamespacesRepository`.
- [ ] Create the specs `apps/backend/src/features/namespaces/infrastructure/database/__tests__/db-namespaces.transformer.spec.ts` and `db-namespaces.repository.spec.ts` (new).
- [ ] Create `apps/backend/src/features/namespaces/application/get-all-namespaces.use-case.ts`, `find-namespace-by-id.use-case.ts`, `create-namespace.use-case.ts` and `update-namespace.use-case.ts` (new) as thin pass-through repository calls.
- [ ] Create `apps/backend/src/features/namespaces/application/delete-namespace.use-case.ts` (new) that calls `countProjects` and throws `NamespaceNotEmptyError` when the count is above `0`.
- [ ] Create the specs `apps/backend/src/features/namespaces/application/__tests__/*.use-case.spec.ts` (new), one per use case; the `delete-namespace.use-case.spec.ts` one covers both the empty-namespace case and the not-empty case.
- [ ] Create `apps/backend/src/features/namespaces/ui/services/namespaces.service.ts` (new) that calls the use cases and calls `enrichTelemetry({ 'namespace.id': ... })` on create.
- [ ] Create `apps/backend/src/features/namespaces/ui/controllers/namespaces.controller.ts` (new) with the `GET /namespaces`, `GET /namespaces/:id`, `POST /namespaces`, `PUT /namespaces/:id` and `DELETE /namespaces/:id` routes.
- [ ] Create the specs `apps/backend/src/features/namespaces/ui/services/__tests__/namespaces.service.spec.ts` and `apps/backend/src/features/namespaces/ui/controllers/__tests__/namespaces.controller.spec.ts` (new).
- [ ] Create `apps/backend/src/features/namespaces/namespaces.module.ts` (new) and register it in the `imports` array of `apps/backend/src/app.module.ts`.
- [ ] Add the `NAMESPACE_NOT_FOUND` → `NotFoundException` and `NAMESPACE_NOT_EMPTY` → `ConflictException` entries, and the `ConflictException` import, to `apps/backend/src/core/ui/translators/http-error.translator.ts`.
- [ ] Add the two new code-to-exception cases to `apps/backend/src/core/ui/translators/__tests__/http-error.translator.spec.ts`.
- [ ] Verify with `rtk pnpm run test` and `rtk pnpm run build` that the new `namespaces` module compiles and its specs pass.

## Phase 3 — Backend, the changes to the `projects` feature

- [ ] Add the required `namespaceId` field to `apps/backend/src/features/projects/domain/models/project.models.ts` only; leave `apps/backend/src/features/projects/domain/dtos/create-project.dto.ts` and `update-project.dto.ts` name-only, because the path segment carries `namespaceId`.
- [ ] Add `ProjectNameTakenError` to `apps/backend/src/features/projects/domain/errors/project.errors.ts`.
- [ ] Change the `getAll` method of `apps/backend/src/features/projects/domain/repositories/projects.repository.ts` to take a required `namespaceId: string`.
- [ ] Add the `namespaceId` parameter to `apps/backend/src/features/projects/application/create-project.use-case.ts`, merging it with the DTO before it calls `repository.create`.
- [ ] Add the `namespaceId` parameter and the fetch-then-compare check to `apps/backend/src/features/projects/application/find-project-by-id.use-case.ts`, `update-project.use-case.ts` and `delete-project.use-case.ts`, throwing `ProjectNotFoundError` when the project does not exist or its `namespaceId` does not match.
- [ ] Add the namespace-mismatch case to `apps/backend/src/features/projects/application/__tests__/find-project-by-id.use-case.spec.ts`, `update-project.use-case.spec.ts` and `delete-project.use-case.spec.ts`.
- [ ] Add the `namespaceId` column, the `namespace` relation and the `@Unique('UQ_projects_namespaceId_name', ['namespaceId', 'name'])` decorator to `apps/backend/src/features/projects/infrastructure/database/db-project.entity.ts`.
- [ ] Change the `where: { namespaceId }` filter on `getAll` to always apply (not just when a filter is given), and add the persistence-error catch on `create` and `update`, in `apps/backend/src/features/projects/infrastructure/database/db-projects.repository.ts`.
- [ ] Add `toProjectPersistenceError` to `apps/backend/src/features/projects/infrastructure/database/db-projects.transformer.ts`, reading the `23505` `unique_violation` code.
- [ ] Add the required-namespace-filter case, and the `toProjectPersistenceError` table-driven cases, to `apps/backend/src/features/projects/infrastructure/database/__tests__/db-projects.repository.spec.ts` and `db-projects.transformer.spec.ts`.
- [ ] Change `apps/backend/src/features/projects/ui/controllers/projects.controller.ts` to `@Controller('namespaces/:namespaceId/projects')`, read `@Param('namespaceId', ParseUUIDPipe)` on every method and `@Param('id', ParseUUIDPipe)` on the id-bearing ones, keep `@Put(':id')` on the update method, and wrap every method's use case call in `try`/`catch`/`translateError`.
- [ ] Remove the inline `if (!project) throw new NotFoundException(...)` checks from `apps/backend/src/features/projects/ui/controllers/projects.controller.ts`, because the use cases of this phase now throw `ProjectNotFoundError` themselves.
- [ ] Add the `'namespace.id'` telemetry field, read from the `namespaceId` path parameter, to the `create` and `update` calls of `apps/backend/src/features/projects/ui/services/projects.service.ts`.
- [ ] Add the `namespaceId` and `id` path-parameter validation cases, and the `try`/`catch`/`translateError` path for all five methods, to `apps/backend/src/features/projects/ui/controllers/__tests__/projects.controller.spec.ts`.
- [ ] Add the `PROJECT_NAME_TAKEN` → `ConflictException` entry to `apps/backend/src/core/ui/translators/http-error.translator.ts`, and the matching case to its spec.
- [ ] Verify with `rtk pnpm run test` and `rtk pnpm run build` that the breaking `projects` contract change compiles and every spec passes.

## Phase 4 — Frontend, the `namespaces` feature

- [ ] Create `apps/frontend/src/app/features/namespaces/domain/models/namespace.model.ts` (new) with the `Namespace` interface.
- [ ] Create `apps/frontend/src/app/features/namespaces/domain/dtos/create-namespace.dto.ts` and `update-namespace.dto.ts` (new).
- [ ] Create `apps/frontend/src/app/features/namespaces/infrastructure/api/namespaces-api.repository.ts` (new), mirroring `projects-api.repository.ts`.
- [ ] Create the spec `apps/frontend/src/app/features/namespaces/infrastructure/api/namespaces-api.repository.spec.ts` (new).
- [ ] Create `apps/frontend/src/app/features/namespaces/ui/components/namespace-card/namespace-card.component.ts` (new), mirroring `project-card.component.ts`.
- [ ] Create `apps/frontend/src/app/features/namespaces/ui/components/namespace-form/namespace-form.component.ts` (new), mirroring `project-form.component.ts`.
- [ ] Create `apps/frontend/src/app/features/namespaces/ui/containers/namespaces-list/namespaces-list.component.ts` (new), mirroring `projects-list.component.ts`.
- [ ] Create `apps/frontend/src/app/features/namespaces/ui/containers/namespace-add/namespace-add.component.ts` (new), mirroring `project-add.component.ts`.
- [ ] Create `apps/frontend/src/app/features/namespaces/ui/containers/namespace-edit/namespace-edit.component.ts` (new), mirroring `project-edit.component.ts`.
- [ ] Create the specs `namespaces-list.component.spec.ts`, `namespace-add.component.spec.ts` and `namespace-edit.component.spec.ts` (new) beside each container.
- [ ] Create `apps/frontend/src/app/pages/namespaces/list/namespaces-list.component.ts` (new) as `NamespacesListPage`.
- [ ] Create `apps/frontend/src/app/pages/namespaces/add/namespace-add.component.ts` (new) as `NamespacesAddPage`.
- [ ] Create `apps/frontend/src/app/pages/namespaces/edit/namespace-edit.component.ts` (new) as `NamespacesEditPage`.
- [ ] Add the `namespaces` route block, with the `list`, `add` and `edit/:id` children, to `apps/frontend/src/app/app.routes.ts`.
- [ ] Verify with `rtk pnpm run test` and `rtk pnpm run build` that the new namespace screens compile and their specs pass.

## Phase 5 — Frontend, the changes to the project screens

- [ ] Add the required `namespaceId` field to `apps/frontend/src/app/features/projects/domain/models/project.model.ts` only; leave `apps/frontend/src/app/features/projects/domain/dtos/create-project.dto.ts` and `update-project.dto.ts` name-only, because the route path carries `namespaceId`.
- [ ] Add the `namespaceId = signal<string | undefined>(undefined)` field to `apps/frontend/src/app/features/projects/infrastructure/api/projects-api.repository.ts`, and build the `projects` resource URL, the `projectById` URL and the `create` / `update` / `delete` URLs from `namespaces/${this.namespaceId()}/projects`.
- [ ] Add the case that the `projects`, `projectById`, `create`, `update` and `delete` URLs include the current `namespaceId` to `apps/frontend/src/app/features/projects/infrastructure/api/projects-api.repository.spec.ts` (new).
- [ ] Read `namespaceId` from the route input (bound by `withComponentInputBinding()`) and set `repository.namespaceId` in `apps/frontend/src/app/features/projects/ui/containers/projects-list/projects-list.component.ts`; remove any namespace-filter `<select>` from this container.
- [ ] Read `namespaceId` from the route input and pass it to `projectsApiRepository.create(namespaceId, { name })` in `apps/frontend/src/app/features/projects/ui/containers/project-add/project-add.component.ts`; do not inject `NamespacesApiRepository` here.
- [ ] Read `namespaceId` and `id` from the route input and pass both to `projectsApiRepository.update(namespaceId, id, { name })` in `apps/frontend/src/app/features/projects/ui/containers/project-edit/project-edit.component.ts`; remove any namespace `<select>` from this container.
- [ ] Verify that `apps/frontend/src/app/features/projects/ui/components/project-form/project-form.component.ts` keeps the name-only `save = output<string>()` and needs no edit.
- [ ] Move the `projects` children of `apps/frontend/src/app/app.routes.ts` under a new `:namespaceId/projects` path nested inside the `namespaces` route, and remove the former top-level `projects` path.
- [ ] Verify with `rtk pnpm run test` and `rtk pnpm run build` that the project screens compile under the nested route and that their specs pass.

## Phase 6 — Documentation

- [ ] Add `namespaces` to the list of grouped entities in `docs/backend-business/domain-model.md`, stating that a namespace groups projects.
- [ ] Add `namespaces` to the one-line description of the domain-model link in `docs/backend-business.md`.
- [ ] Add the `namespaces` feature to the worked examples of `docs/backend-architecture.md` or `docs/backend-architecture/structure.md` where they describe the entity model, alongside the existing `projects` example.
- [ ] Add the `namespaces` feature to the worked examples of `docs/frontend-architecture.md` or `docs/frontend-architecture/structure.md` where they describe the entity model, alongside the existing `projects` example.
- [ ] Verify with `rtk pnpm run build` that no documentation change breaks a path referenced by the build.
