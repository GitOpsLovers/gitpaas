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
- [x] 1.6 Add the tasks `check-types`, `generate:openapi` and `generate:docs` to the `turbo.json` of the root, beside the nine tasks that it declares today.
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
- [ ] 2.10 Give `packages/contracts` a runner of tests, and write there the specs of the two schemas of the
  projects. The two specs of `domain/dtos/__tests__/` were deleted with their files, because the package
  declares only `build` and `check-types` today. Thirteen cases of the validation carry no test at this
  moment. Ask the user to install the runner.
- [x] 2.11 Point the repository of the API, the containers and the components of the projects at the package.
- [x] 2.12 Delete the model and the data transfer objects of the projects in the frontend.
- [x] 2.13 Verify that the slice compiles and that the specs pass.

## 3. The shape of a timestamp on the wire

- [ ] 3.1 Model each timestamp as a text of the ISO form in the package, and keep the `Date` in the domain models of the backend.
- [x] 3.2 Create `apps/backend/src/features/deployments/ui/transformers/deployment-response.transformer.ts`.
- [x] 3.3 Create the equivalent transformers of the answer for the containers, the networks, the users, the entries of the log, the providers and the registrations of a provider. Nine models of the backend carry a `Date` today.
- [x] 3.4 Leave the refresh token out. It carries three `Date` fields, and no answer of the API gives that model.
- [ ] 3.5 Import the type of the contract with another name where the domain model carries the same name.
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
- [ ] 4.10 Create `packages/contracts/src/namespaces/`, `packages/contracts/src/containers/` and `packages/contracts/src/networks/`, and migrate the three features.
- [ ] 4.11 Delete each remaining file of the frontend that describes a shape of the wire, and keep the shapes that only the client has. 35 files of the domain describe a shape today, over twelve features.
- [ ] 4.12 Keep the bindings of `ParseUUIDPipe` and of `ParseIntPipe`.
- [ ] 4.13 Verify each feature before its pull request.

## 5. The shapes that only one side has

- [ ] 5.1 Create `packages/contracts/src/shared/error-envelope.contract.ts` from the interface at `apps/backend/src/core/ui/filters/all-exceptions.filter.ts:25`, which the filter does not export.
- [ ] 5.2 Import that contract in the filter, and remove the local interface.
- [ ] 5.3 Create `packages/contracts/src/logs/log-event.contract.ts` with the **three** kinds of the union, which the section 0 already added to the frontend.
- [ ] 5.4 Replace the cast `as LogEvent` of `parseSseEvent` with a parse against the schema, at `apps/frontend/src/app/features/deployments/infrastructure/api/deployments-api.repository.ts:181`.
- [ ] 5.5 Report the failure of a parse to the subscriber, in place of giving an event whose shape is wrong.
- [ ] 5.6 Delete the model of the event of the log in the frontend, and point its consumers at the package.
- [ ] 5.7 Read the `code` of the envelope, in place of the number of the status, in the interceptor and in the containers that show a failure.
- [ ] 5.8 Add the option of the parse to the reads where a wrong shape gives a silent failure.
- [ ] 5.9 Verify that the window of the output cannot compile if a kind of the union has no case.

## 6. The generated artifacts

- [ ] 6.1 Ask the user to install a generator of OpenAPI for Zod in the package, and a builder of the HTML reference at the root.
- [ ] 6.2 Create `packages/contracts/src/scripts/generate-openapi.ts`, which walks the maps of the endpoints and converts each schema.
- [ ] 6.3 Add the script `generate:openapi`, which runs the compiled output.
- [ ] 6.4 Add the script `generate:docs`, which builds the HTML reference from the specification.
- [ ] 6.5 Commit the generated `packages/contracts/openapi/openapi.json`.
- [ ] 6.6 Add the generated `docs/api/`, and a link to it from `README.md`.
- [ ] 6.7 Add the second gate to the workflow: run the generation, then prove that the difference is empty.
- [ ] 6.8 Add the third gate: compare the specification of the branch with the one of `main`, and publish the report in the pull request.
- [ ] 6.9 Run the tasks of the workflow with the filter of the changed packages.

## 7. The removal of the old machinery

- [ ] 7.1 Verify that no parameter of a body in `apps/backend/src` is a class. There are 14 bindings of a body today, over 13 classes.
- [ ] 7.2 Remove the call of the global pipe of validation from `apps/backend/src/bootstrap.ts`, near line 37.
- [ ] 7.3 Keep `class-validator` as a dependency, for the validation of the environment.
- [ ] 7.4 Verify that a failure of the validation still gives an array of messages in the envelope of the error.

## 8. The decisions that the user must make

These block no phase, and one of them shapes a schema. Ask the user at the start of the phase that needs
them.

- [x] 8.1 The true optionality of the fields of the service is **answered** by the columns: the three fields of the deployment are obligatory texts, and `providerId` is a nullable text. Task 4.1 records the evidence.
- [ ] 8.2 Decide if the server checks its own answers at run time, and if the parse runs only outside the production.
- [ ] 8.3 Decide if the validation of the environment moves to Zod, which removes the last consumer of `class-validator`.
- [ ] 8.4 Decide how the paths of the endpoints are used, because the repositories of the frontend build their addresses from the environment with texts of the template.
- [ ] 8.5 Decide which tool builds the HTML reference, and if `docs/api/` lives in Git (needed by 6.1).
- [ ] 8.6 Decide if the shape of the archive of the logs belongs in the package, because it has no consumer in the frontend today.
- [x] 8.7 The name of the package is **answered**: `@gitpaas/contracts`. The user chose the scope `@gitpaas/` for the whole workspace, so `apps/backend` is `@gitpaas/backend` and `apps/frontend` is `@gitpaas/frontend`. The root manifest keeps the name `@gitopslovers/gitpaas`.

## 9. The records that the change leaves behind

- [x] 9.1 Record in `docs/monorepo-architecture/conventions.md` that the scope of the workspace is `@gitpaas/`, that each application and the package of the contracts carry it, and that the root manifest keeps `@gitopslovers/gitpaas`.
- [ ] 9.2 Record in `docs/monorepo-architecture/` the three tasks that `turbo.json` receives, and the order that they need.
- [ ] 9.3 Record that `apps/frontend/src/app/features/source-control/` is dead code: it holds five shapes of the wire, no file outside it imports it, and the feature `providers` replaced it. A separate change deletes it.
