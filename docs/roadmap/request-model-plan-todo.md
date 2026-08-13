# Request model plan — to-do list

For the detail behind each item, see [request model plan](./request-model-plan.md).

All the paths are relative to the root of the repository, if there is no other indication.

---

## Phase 0 — The rails

- [ ] Ask the user to install `zod` (v4) in `packages/contracts` as a run-time dependency.
- [ ] Create `packages/contracts/package.json` (new) with the name `@gitopslovers/contracts`.
- [ ] Create `packages/contracts/tsconfig.json` (new) that emits the declarations to `packages/contracts/dist/`.
- [ ] Create `packages/contracts/src/index.ts` (new) as the public barrel of the package.
- [ ] Create `packages/contracts/src/shared/endpoint.contract.ts` (new) with the `EndpointDescriptor` and the `EndpointMap` types.
- [ ] Create `turbo.json` (new) with the `build`, `check-types`, `test`, `lint`, `generate:openapi`, `generate:docs` and `dev` tasks.
- [ ] Add the `dependsOn: ["^build"]` rule to the `build`, `check-types` and `test` tasks in `turbo.json`, so `packages/contracts` builds first.
- [ ] Add a `check-types` script to `apps/backend/package.json` with the body `tsc -p tsconfig.json --noEmit`.
- [ ] Add a `check-types` script to `apps/frontend/package.json` with an Angular build, because only the Angular compiler checks a template.
- [ ] Add a `pnpm run check-types` step (gate 1) to `.github/workflows/pr-verify.yml`, before the `lint` and the `test` steps.
- [ ] Verify with `rtk pnpm run check-types` at the root that the pipeline builds the package and checks the two applications.

## Phase 1 — The reference slice: `projects`

- [ ] Create `packages/contracts/src/projects/project.contract.ts` (new) with `projectSchema`, `createProjectSchema`, `updateProjectSchema` and the inferred types.
- [ ] Create `packages/contracts/src/projects/projects.endpoints.ts` (new) with the route descriptors of the list, the read, the create, the update and the remove operations.
- [ ] Export the new files from `packages/contracts/src/index.ts`.
- [ ] Add `"@gitopslovers/contracts": "workspace:*"` to `apps/backend/package.json` and to `apps/frontend/package.json`, and ask the user to link the workspace.
- [ ] Create `apps/backend/src/core/ui/pipes/zod-validation.pipe.ts` (new) with the `safeParse` call and the `BadRequestException` that carries a message array.
- [ ] Create the `toValidationMessage` helper that gives one string for each Zod issue.
- [ ] Create the spec of the pipe in `apps/backend/src/core/ui/pipes/__tests__/zod-validation.pipe.spec.ts` (new).
- [ ] Bind the schemas with the new pipe on each `@Body()` parameter of `apps/backend/src/features/projects/ui/controllers/projects.controller.ts`.
- [ ] Convert `apps/backend/src/features/projects/domain/dtos/create-project.dto.ts` and `update-project.dto.ts` into re-exports of the contract types.
- [ ] Move the class assertions of the `__tests__` specs of `apps/backend/src/features/projects/domain/dtos/` to `createProjectSchema.safeParse(...)` and `updateProjectSchema.safeParse(...)`.
- [ ] Point `apps/frontend/src/app/features/projects/infrastructure/api/projects-api.repository.ts` at `@gitopslovers/contracts`.
- [ ] Point the containers and the components of `apps/frontend/src/app/features/projects/ui/` at the package.
- [ ] Delete `apps/frontend/src/app/features/projects/domain/models/project.model.ts` and the DTO files of `apps/frontend/src/app/features/projects/domain/dtos/`.
- [ ] Verify with `rtk pnpm run check-types` and `rtk pnpm run test` that the slice compiles and the specs pass.

## Phase 2 — The wire shape of a timestamp

- [ ] Model each timestamp as `z.iso.datetime()` in the contract package, and keep the `Date` in the backend domain models.
- [ ] Create `apps/backend/src/features/deployments/ui/transformers/deployment-response.transformer.ts` (new) with `toDeploymentResponse`.
- [ ] Create the equivalent response transformers for the containers, the networks, the users and the log entries in the `ui/transformers/` folder of each feature.
- [ ] Import the contract type with an alias (for example `Deployment as DeploymentResponse`) where the domain model has the same name.
- [ ] Edit the applicable controllers, so they return the transformed shape and declare the contract type as the return type.
- [ ] Verify with `rtk pnpm run check-types` and `rtk pnpm run test` that the conversion is proved by the compiler.

## Phase 3 — The remaining features, one pull request for each

- [ ] Read the column definitions in `apps/backend/src/features/services/infrastructure/` and record the true optionality of `repositoryId`, `deploymentBranch` and `composerPath`.
- [ ] Create `packages/contracts/src/services/` (new) with the schemas, the endpoint map and the resolved optionality.
- [ ] Migrate the `services` feature: the backend controller and DTOs, and the deleted twins in `apps/frontend/src/app/features/services/domain/`.
- [ ] Create `packages/contracts/src/deployments/` (new) and migrate the `deployments` feature.
- [ ] Create `packages/contracts/src/authentication/` (new) and migrate the `authentication` and the `users` features.
- [ ] Resolve the `User` / `AuthenticatedUser` / `UserRole` triple in one schema, with no `passwordHash` in a response shape.
- [ ] Move `AuthenticatedUser` out of `apps/backend/src/features/authentication/ui/services/authentication.service.ts` into the contract package.
- [ ] Create `packages/contracts/src/source-control/` (new) and migrate the `source-control` feature.
- [ ] Create `packages/contracts/src/server/` (new) with the readiness shape and the status shape (`ContainerRuntimeInfo & { connected: boolean }`), which are inline in `apps/backend/src/features/server/ui/controllers/server.controller.ts` today.
- [ ] Create `packages/contracts/src/containers/` and `packages/contracts/src/networks/` (new) and migrate the two features.
- [ ] Delete each frontend `domain/models/` and `domain/dtos/` file that describes a wire shape, and keep the client-only shapes in `domain/`.
- [ ] Keep the `ParseUUIDPipe` and the `ParseIntPipe` bindings, and use the Zod pipe only for a query object with more than one field.
- [ ] Verify each feature with `rtk pnpm run check-types` and `rtk pnpm run test` before the pull request of the feature.

## Phase 4 — The shapes that only one side has

- [ ] Create `packages/contracts/src/shared/error-envelope.contract.ts` (new) from the unexported `ErrorEnvelope` interface of `apps/backend/src/core/ui/filters/all-exceptions.filter.ts`.
- [ ] Import the envelope contract in `apps/backend/src/core/ui/filters/all-exceptions.filter.ts` and remove the local interface.
- [ ] Create `packages/contracts/src/logs/log-event.contract.ts` (new) with the three variants of the union: the line event, the end event and the error event.
- [ ] Replace the `as LogEvent` cast of `parseSseEvent` with `logEventSchema.parse(...)` in `apps/frontend/src/app/features/deployments/infrastructure/api/deployments-api.repository.ts`.
- [ ] Handle the `error` variant in `apps/frontend/src/app/features/services/ui/components/deployment-logs-modal/deployment-logs-modal.component.ts`, so it shows the code and the safe message.
- [ ] Delete `apps/frontend/src/app/features/logs/domain/models/log-event.model.ts` and point its consumers at the package.
- [ ] Read the `code` of the envelope, in place of the status number, in `apps/frontend/src/app/features/authentication/ui/interceptors/auth.interceptor.ts` and in the containers that show a failure.
- [ ] Add the `parse` option of `httpResource` to the reads where a wrong shape gives a silent failure.
- [ ] Verify with `rtk pnpm run check-types` and `rtk pnpm run test` that the modal cannot compile without the `error` variant.

## Phase 5 — The generated artefacts

- [ ] Ask the user to install an OpenAPI generator for Zod in `packages/contracts` and an OpenAPI HTML builder at the root, both as dev dependencies.
- [ ] Create `packages/contracts/src/scripts/generate-openapi.ts` (new) that walks the endpoint maps and converts each schema.
- [ ] Add the `generate:openapi` script to `packages/contracts/package.json`, which runs `node dist/scripts/generate-openapi.js`.
- [ ] Add the `generate:docs` script that builds the HTML reference from the specification.
- [ ] Commit the generated `packages/contracts/openapi/openapi.json` (new).
- [ ] Add the generated `docs/api/` (new) and a link to it from `README.md`.
- [ ] Add a gate 2 step to `.github/workflows/pr-verify.yml`: run the generation, then `git diff --exit-code packages/contracts/openapi`.
- [ ] Add a gate 3 step to `.github/workflows/pr-verify.yml` that compares the specification of the branch with the specification of `main` and publishes the report in the pull request.
- [ ] Run the tasks of `.github/workflows/pr-verify.yml` with `--filter=...[origin/main]`, and keep the `lint` and the `test` steps with no change.
- [ ] Verify with `rtk pnpm run generate:openapi` and `rtk git diff --exit-code packages/contracts/openapi` that the committed specification is current.

## Phase 6 — Remove the old machinery

- [ ] Verify that no `@Body()` parameter in `apps/backend/src` is a class any more.
- [ ] Remove the `useGlobalPipes(new ValidationPipe(...))` call from `apps/backend/src/bootstrap.ts`.
- [ ] Keep `class-validator` as a dependency for `apps/backend/src/core/infrastructure/config/env-validation.config.ts`.
- [ ] Verify with `rtk pnpm run check-types` and `rtk pnpm run test` that the validation failures still give a message array in the error envelope.

---

## Defects that the plan reports

- [ ] Add the missing `error` variant to the frontend `LogEvent` union of `apps/frontend/src/app/features/logs/domain/models/log-event.model.ts`, because `deployment-logs-modal.component.ts` treats each event that is not a line as an end event and sets the final status to `undefined` (phase 4).
- [ ] Resolve the contradictory optionality of `repositoryId`, `deploymentBranch` and `composerPath` between `apps/backend/src/features/services/domain/models/service.models.ts` (required) and `apps/frontend/src/app/features/services/domain/models/service.model.ts` (optional) (phase 3).
- [ ] Record in `docs/monorepo-architecture.md` that the workspace names `@gitopslovers/gitpaas/<app>` hold two slashes and are not valid npm package names, and that the contract package therefore uses one slash.
- [ ] Add the missing type-check step to `.github/workflows/pr-verify.yml`, which today runs only `lint` and `test` and thus lets a type failure pass (phase 0).

---

## Blocked / decisions needed

- [ ] Decide if the server validates its own responses at run time, and if the parse runs only when `NODE_ENV !== 'production'`.
- [ ] Decide if the environment validation of `apps/backend/src/core/infrastructure/config/env-validation.config.ts` moves to Zod, which removes the last consumer of `class-validator`.
- [ ] Decide the true optionality of the three `Service` fields from the evidence in `apps/backend/src/features/services/infrastructure/`, before the schema of phase 3 is written.
- [ ] Decide how the endpoint paths are used, because the frontend repositories build their URLs from `environment.apiBaseUrl` with template strings; a typed URL builder is a separate step.
- [ ] Decide which tool builds the HTML reference, and if `docs/api/` is committed.
- [ ] Decide if the archive shape `LogEntry` of `GET /api/v1/logs?deploymentId=` belongs in the package, because it has no frontend consumer today.
- [ ] Decide the final package name: `@gitopslovers/contracts` or `@gitopslovers/gitpaas-contracts`.
