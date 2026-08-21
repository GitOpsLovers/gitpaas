## 0. The event of the error of the stream

This section delivers one pull request, and it needs no part of the package. It closes a defect that the
user sees today: the window of the output treats every event that is no line as an event of the end, so an
event of the error leaves the mark of the status without a value and hides the cause.

- [x] 0.1 Add the third kind, `error`, to the union `LogEvent` of `apps/frontend/src/app/features/logs/domain/models/log-event.model.ts`, with the fields `code` and `message`.
- [x] 0.2 Handle that kind in `apps/frontend/src/app/features/services/ui/components/deployment-logs-modal/deployment-logs-modal.component.ts`, near line 82, so the window shows the code and the safe message, and so it does not set the final status from an event that carries none.
- [x] 0.3 Show the code and the message in `deployment-logs-modal.component.html`.
- [x] 0.4 Cover the three kinds in the spec of the component, one case for each.
- [x] 0.5 Verify that the suite of the frontend passes, headless.

## 1. The rails

- [x] 1.1 Ask the user to install `zod` (version 4) in `packages/contracts` as a dependency of the run time.
- [x] 1.2 Create `packages/contracts/package.json` with the name `@gitpaas/contracts`.
- [x] 1.3 Create `packages/contracts/tsconfig.json`, which emits the declarations to `packages/contracts/dist/`.
- [x] 1.4 Create `packages/contracts/src/index.ts` as the public barrel of the package.
- [x] 1.5 Create `packages/contracts/src/shared/endpoint.contract.ts` with the types `EndpointDescriptor` and `EndpointMap`.
- [x] 1.6 Add the task `check-types` to the `turbo.json` of the root, beside the nine tasks that it declares today.
- [x] 1.7 Add the rule `dependsOn: ["^build"]` to the new task `check-types`. The tasks `build` and `test` already carry it, so leave them as they are.
- [x] 1.8 Add a script `check-types` to `apps/backend/package.json`, with the body `tsc -p tsconfig.json --noEmit`.
- [x] 1.9 Add a script `check-types` to `apps/frontend/package.json` with a build of Angular, because only the compiler of Angular checks a template.
- [x] 1.10 Add a step `check-types` to the job `verify` of `.github/workflows/pr-verify.yml`, before the step of the lint. The workflow runs the lint, the tests and the build today.
- [x] 1.11 Add `packages/**` to the filter `paths` of that workflow, so a change of the package runs the job.
- [x] 1.12 Verify that the pipeline builds the package and checks the two applications.

## 2. The reference slice: the projects

- [x] 2.1 Create `packages/contracts/src/projects/project.contract.ts` with the schemas of the project, of the creation and of the change, and the inferred types.
- [x] 2.2 Create `packages/contracts/src/projects/projects.endpoints.ts` with the descriptors of the five routes.
- [x] 2.3 Export the two new files from `packages/contracts/src/index.ts`.
- [x] 2.4 Add `"@gitpaas/contracts": "workspace:*"` to the two applications, and ask the user to link the workspace.
- [x] 2.5 Create `apps/backend/src/core/ui/pipes/zod-validation.pipe.ts` with the call of `safeParse` and the exception that carries an array of messages.
- [x] 2.6 Create the helper that gives one text for each issue of Zod.
- [x] 2.7 Create the spec of the pipe.
- [x] 2.8 Bind the schemas with the new pipe on each parameter of the body of the controller of the projects.
- [x] 2.9 Delete the two data transfer objects of a body of the projects, and point their fourteen consumers at `@gitpaas/contracts` directly. Decision 11 of `design.md` gives the rule.
- [x] 2.10 The package runs Vitest. It carries `vitest.config.ts`, a script `test`, and a `tsconfig.build.json`
  that keeps a spec out of `dist/`, after the pattern of `apps/backend`. The specs of
  `src/projects/__tests__/project.contract.spec.ts` cover the three schemas of the projects with 20 cases.
  The task `test` of `turbo.json` needed no change, because it carries no filter of the paths.
- [x] 2.11 Point the repository of the API, the containers and the components of the projects at the package.
- [x] 2.12 Delete the model and the data transfer objects of the projects in the frontend.
- [x] 2.13 Verify that the slice compiles and that the specs pass.

## 3. The shape of a timestamp on the wire

- [x] 3.1 Model each timestamp as a text of the ISO form in the package, and keep the `Date` in the domain models of the backend.
- [x] 3.2 Create `apps/backend/src/features/deployments/ui/transformers/deployment-response.transformer.ts`.
- [x] 3.3 Create the equivalent transformers of the answer for the containers, the networks, the users, the entries of the log, the providers and the registrations of a provider. Nine models of the backend carry a `Date` today.
- [x] 3.4 Leave the refresh token out. It carries three `Date` fields, and no answer of the API gives that model.
- [x] 3.5 Import the type of the contract with another name where the domain model carries the same name.
- [x] 3.6 Change the applicable controllers, so they give the transformed shape and declare the type of the contract.
- [x] 3.7 Verify that the compiler proves the conversion.

## 4. The remaining features, one pull request for each

Each migration of this section applies the decision 11: it deletes the file of the data transfer object of
a body, and it points every consumer at the package. A shape that only the backend has stays in
`domain/dtos/`.

- [x] 4.1 Apply the evidence of the columns of `apps/backend/src/features/services/infrastructure/database/db-service.entity.ts`: `repositoryId`, `deploymentBranch` and `composerPath` carry `default: ''` and refuse an empty value, so the three are obligatory texts. `providerId` carries `nullable: true`, so it is a nullable text.
- [x] 4.2 Create `packages/contracts/src/services/` with the schemas, the map of the endpoints and that resolved optionality, and migrate the feature. Use `.nullable()` for `providerId`, and never `.optional()`.
- [x] 4.3 Create `packages/contracts/src/deployments/` and migrate the feature.
- [x] 4.4 Create `packages/contracts/src/authentication/` and migrate the features of the authentication and of the users.
- [x] 4.5 Resolve the three names of the user in one schema, with no hash of the password in a shape of an answer.
- [x] 4.6 Move the type `AuthenticatedUser` out of `apps/backend/src/features/authentication/ui/services/authentication.service.ts` into the package.
- [x] 4.7 Create `packages/contracts/src/providers/` and migrate the feature. Declare `ProviderType` as one `z.enum`, add `createdAt` and `updatedAt` as texts of the ISO form, and keep `privateKey` out of every shape of an answer.
- [x] 4.8 Point the nine shapes of the frontend of `features/providers/` at the package, and delete the ones that describe the wire.
- [x] 4.9 Create `packages/contracts/src/server/` with the shape of the readiness and the shape of the state of the daemon, and delete the copy of the frontend, which holds the same text as the file of the backend.
- [x] 4.10 Create `packages/contracts/src/namespaces/`, `packages/contracts/src/containers/` and `packages/contracts/src/networks/`, and migrate the three features.
- [x] 4.11 Delete each remaining file of the frontend that describes a shape of the wire, and keep the shapes that only the client has. 35 files of the domain describe a shape today, over twelve features.
- [x] 4.12 Keep the bindings of `ParseUUIDPipe` and of `ParseIntPipe`.
- [x] 4.13 Verify each feature before its pull request.

## 5. The shapes that only one side has

- [x] 5.1 Create `packages/contracts/src/shared/error-envelope.contract.ts` from the interface at `apps/backend/src/core/ui/filters/all-exceptions.filter.ts:25`, which the filter does not export.
- [x] 5.2 Import that contract in the filter, and remove the local interface.
- [x] 5.3 Create `packages/contracts/src/logs/log-event.contract.ts` with the **three** kinds of the union, which the section 0 already added to the frontend.
- [x] 5.4 Replace the cast `as LogEvent` of `parseSseEvent` with a parse against the schema, at `apps/frontend/src/app/features/deployments/infrastructure/api/deployments-api.repository.ts:181`.
- [x] 5.5 Report the failure of a parse to the subscriber, in place of giving an event whose shape is wrong.
- [x] 5.6 Delete the model of the event of the log in the frontend, and point its consumers at the package.
- [x] 5.7 Read the `code` of the envelope, in place of the number of the status, in the interceptor and in the containers that show a failure.
- [x] 5.8 Add the option of the parse to the reads where a wrong shape gives a silent failure.
- [x] 5.9 Verify that the window of the output cannot compile if a kind of the union has no case.

## 6. The removal of the layer of the generation

The change delivered this layer, and then it dropped it. Decision 7 of `design.md` gives the reason. The
code sits on the branch `feat/request-model`, and the commit `9f2aec8` carries a part of it, so the layer
comes out by an edit.

- [x] 6.1 Delete `packages/contracts/src/scripts/`, which holds `generate-openapi.ts`, `generate-markdown.ts`, `endpoint-shapes.ts` and `node-builtins.d.ts`.
- [x] 6.2 Delete `packages/contracts/openapi/` and `packages/contracts/redocly.yaml`.
- [x] 6.3 Delete `docs/api/`, and the row of the table of `README.md` that links its index.
- [x] 6.4 Delete the `.gitattributes` of the root, which marks the two generated artifacts alone.
- [x] 6.5 Remove the scripts `generate:openapi`, `generate:docs` and `lint:openapi` from `packages/contracts/package.json`, and the two scripts that delegate from the manifest of the root.
- [x] 6.6 Remove the tasks `generate:openapi`, `generate:docs` and `lint:openapi` from `turbo.json`. The task `check-types` stays.
- [x] 6.7 Delete `.github/workflows/pr-api.yml`, and remove `.oasdiff` from `.gitignore`.
- [x] 6.8 `@redocly/cli` is **absent** from the manifest of the root. A search of `package.json` and of `pnpm-lock.yaml` gives no result.
- [x] 6.9 Verify that `rtk pnpm run build` and `rtk pnpm run check-types` pass, and that `pr-verify.yml` keeps the gate of the types.
- [x] 6.10 The pull request 123 was **merged**, not closed. So the layer came out by the edits of the tasks 6.1 to 6.7, as the header of this section states. Nothing remains to close.

## 7. The removal of the old machinery

- [x] 7.1 Verify that no parameter of a body in `apps/backend/src` is a class. There are 14 bindings of a body today, over 13 classes.
- [x] 7.2 Remove the call of the global pipe of validation from `apps/backend/src/bootstrap.ts`, near line 37.
- [x] 7.3 Keep `class-validator` as a dependency, for the validation of the environment.
- [x] 7.4 Verify that a failure of the validation still gives an array of messages in the envelope of the error.

## 8. The decisions that the user must make

These block no phase, and one of them shapes a schema. Ask the user at the start of the phase that needs
them.

- [x] 8.1 The true optionality of the fields of the service is **answered** by the columns: the three fields of the deployment are obligatory texts, and `providerId` is a nullable text. Task 4.1 records the evidence.
- [x] 8.2 The server checks its own answers at run time: **no**. The user chose no parse. The compiler proves the shape of each answer, because every transformer declares the type of the contract. A parse at run time costs work and finds nothing that the build does not find.
- [x] 8.3 The validation of the environment moves to Zod: **yes**, and the removal is complete. The environment was one of 14 consumers, not the last one. So `env-validation.config.ts` became a schema of Zod that reuses `formatZodIssue`, nine internal data transfer objects lost their inert decorators and became interfaces, nine specs of those decorators were deleted, and `class-validator` and `class-transformer` left `apps/backend/package.json`.
- [x] 8.4 The paths of the endpoints are **answered**: the change deletes the maps. They had no consumer, because they served the generation of OpenAPI that section 6 removed. The ten files of the descriptors left `packages/contracts`, and the barrel dropped their exports. The repositories of the frontend keep their texts of the template.
- [x] 8.5 The tools of the reference are **answered**, and the answer is that the change builds none. It generates no document of OpenAPI, and no reference for a reader. Decision 7 of `design.md` gives the three reasons: the compiler carries the guarantee, the only consumer of the API lives in this repository, and the schemas rebuild the artifact on the day that a consumer outside it appears. `@redocly/cli` leaves the manifest of the root, and the action `oasdiff` leaves the workflow. Section 6 removes the code.
- [x] 8.6 The shape of the archive of the logs belongs in the package: **no**. The user chose to keep it in the backend. It lives in `apps/backend/src/features/logs/infrastructure/redis/` alone, it never crosses the wire, and the frontend has no consumer for it.
- [x] 8.7 The name of the package is **answered**: `@gitpaas/contracts`. The user chose the scope `@gitpaas/` for the whole workspace, so `apps/backend` is `@gitpaas/backend` and `apps/frontend` is `@gitpaas/frontend`. The root manifest keeps the name `@gitopslovers/gitpaas`.

## 9. The records that the change leaves behind

- [x] 9.1 Record in `docs/monorepo-architecture/conventions.md` that the scope of the workspace is `@gitpaas/`, that each application and the package of the contracts carry it, and that the root manifest keeps `@gitopslovers/gitpaas`.
- [x] 9.2 Recorded in `docs/monorepo-architecture/operations.md`: the body of the script in each workspace, the reason that the frontend needs a build of Angular and not `tsc` alone, the reason for `dependsOn: ["^build"]`, and the step of the job `verify` before the lint. The same edit corrected two stale statements of the table of the integration.
- [x] 9.3 Recorded in `docs/frontend-architecture/structure.md`. **The claim of this task was wrong in one point.** Three files of `apps/frontend/src/app/pages/source-control/` do import `@features/source-control/`. But no route of `app.routes.ts` reaches that folder of the pages either, so the dead code is a chain of two folders, and not a folder with no importer. The record states the corrected fact. A separate change deletes both folders.
