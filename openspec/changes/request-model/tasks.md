## 1. The rails

- [ ] 1.1 Ask the user to install `zod` (version 4) in `packages/contracts` as a dependency of the run time.
- [ ] 1.2 Create `packages/contracts/package.json` with the name `@gitopslovers/contracts`.
- [ ] 1.3 Create `packages/contracts/tsconfig.json`, which emits the declarations to `packages/contracts/dist/`.
- [ ] 1.4 Create `packages/contracts/src/index.ts` as the public barrel of the package.
- [ ] 1.5 Create `packages/contracts/src/shared/endpoint.contract.ts` with the types `EndpointDescriptor` and `EndpointMap`.
- [ ] 1.6 Create `turbo.json` with the tasks `build`, `check-types`, `test`, `lint`, `generate:openapi`, `generate:docs` and `dev`.
- [ ] 1.7 Add the rule `dependsOn: ["^build"]` to the tasks `build`, `check-types` and `test`, so `packages/contracts` builds first.
- [ ] 1.8 Add a script `check-types` to `apps/backend/package.json`, with the body `tsc -p tsconfig.json --noEmit`.
- [ ] 1.9 Add a script `check-types` to `apps/frontend/package.json` with a build of Angular, because only the compiler of Angular checks a template.
- [ ] 1.10 Add a step of `check-types` to `.github/workflows/pr-verify.yml`, before the steps of the lint and of the tests.
- [ ] 1.11 Verify that the pipeline builds the package and checks the two applications.

## 2. The reference slice: the projects

- [ ] 2.1 Create `packages/contracts/src/projects/project.contract.ts` with the schemas of the project, of the creation and of the change, and the inferred types.
- [ ] 2.2 Create `packages/contracts/src/projects/projects.endpoints.ts` with the descriptors of the five routes.
- [ ] 2.3 Export the two new files from `packages/contracts/src/index.ts`.
- [ ] 2.4 Add `"@gitopslovers/contracts": "workspace:*"` to the two applications, and ask the user to link the workspace.
- [ ] 2.5 Create `apps/backend/src/core/ui/pipes/zod-validation.pipe.ts` with the call of `safeParse` and the exception that carries an array of messages.
- [ ] 2.6 Create the helper that gives one text for each issue of Zod.
- [ ] 2.7 Create the spec of the pipe.
- [ ] 2.8 Bind the schemas with the new pipe on each parameter of the body of the controller of the projects.
- [ ] 2.9 Convert the two data transfer objects of the projects into re-exports of the types of the contract.
- [ ] 2.10 Move the assertions of the specs of those two files to `safeParse`.
- [ ] 2.11 Point the repository of the API, the containers and the components of the projects at the package.
- [ ] 2.12 Delete the model and the data transfer objects of the projects in the frontend.
- [ ] 2.13 Verify that the slice compiles and that the specs pass.

## 3. The shape of a timestamp on the wire

- [ ] 3.1 Model each timestamp as a text of the ISO form in the package, and keep the `Date` in the domain models of the backend.
- [ ] 3.2 Create `apps/backend/src/features/deployments/ui/transformers/deployment-response.transformer.ts`.
- [ ] 3.3 Create the equivalent transformers of the answer for the containers, the networks, the users and the entries of the log.
- [ ] 3.4 Import the type of the contract with another name where the domain model carries the same name.
- [ ] 3.5 Change the applicable controllers, so they give the transformed shape and declare the type of the contract.
- [ ] 3.6 Verify that the compiler proves the conversion.

## 4. The remaining features, one pull request for each

- [ ] 4.1 Read the definitions of the columns in `apps/backend/src/features/services/infrastructure/`, and record the true optionality of `repositoryId`, `deploymentBranch` and `composerPath`.
- [ ] 4.2 Create `packages/contracts/src/services/` with the schemas, the map of the endpoints and the resolved optionality, and migrate the feature.
- [ ] 4.3 Create `packages/contracts/src/deployments/` and migrate the feature.
- [ ] 4.4 Create `packages/contracts/src/authentication/` and migrate the features of the authentication and of the users.
- [ ] 4.5 Resolve the three names of the user in one schema, with no hash of the password in a shape of an answer.
- [ ] 4.6 Move the type of the profile out of the service of the authentication into the package.
- [ ] 4.7 Create `packages/contracts/src/source-control/` and migrate the feature.
- [ ] 4.8 Create `packages/contracts/src/server/` with the shape of the readiness and the shape of the state, which are written inside the controller today.
- [ ] 4.9 Create `packages/contracts/src/containers/` and `packages/contracts/src/networks/`, and migrate the two features.
- [ ] 4.10 Delete each file of the frontend that describes a shape of the wire, and keep the shapes that only the client has.
- [ ] 4.11 Keep the bindings of `ParseUUIDPipe` and of `ParseIntPipe`.
- [ ] 4.12 Verify each feature before its pull request.

## 5. The shapes that only one side has

- [ ] 5.1 Create `packages/contracts/src/shared/error-envelope.contract.ts` from the interface that the filter of the exceptions does not export.
- [ ] 5.2 Import that contract in the filter, and remove the local interface.
- [ ] 5.3 Create `packages/contracts/src/logs/log-event.contract.ts` with the **three** kinds of the union.
- [ ] 5.4 Replace the cast of `parseSseEvent` with a parse against the schema, in the repository of the API of the deployments.
- [ ] 5.5 Handle the kind `error` in the window of the output, so it shows the code and the safe message. **This step closes a live defect.**
- [ ] 5.6 Delete the model of the event of the log in the frontend, and point its consumers at the package.
- [ ] 5.7 Read the `code` of the envelope, in place of the number of the status, in the interceptor and in the containers that show a failure.
- [ ] 5.8 Add the option of the parse to the reads where a wrong shape gives a silent failure.
- [ ] 5.9 Verify that the window of the output cannot compile without the kind `error`.

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

- [ ] 7.1 Verify that no parameter of a body in `apps/backend/src` is a class.
- [ ] 7.2 Remove the call of the global pipe of validation from `apps/backend/src/bootstrap.ts`.
- [ ] 7.3 Keep `class-validator` as a dependency, for the validation of the environment.
- [ ] 7.4 Verify that a failure of the validation still gives an array of messages in the envelope of the error.

## 8. The decisions that the user must make

These block no phase, and two of them shape a schema. Ask the user at the start of the phase that needs
them.

- [ ] 8.1 Decide the true optionality of the three fields of the service, from the evidence of the columns (needed by 4.1).
- [ ] 8.2 Decide if the server checks its own answers at run time, and if the parse runs only outside the production.
- [ ] 8.3 Decide if the validation of the environment moves to Zod, which removes the last consumer of `class-validator`.
- [ ] 8.4 Decide how the paths of the endpoints are used, because the repositories of the frontend build their addresses from the environment with texts of the template.
- [ ] 8.5 Decide which tool builds the HTML reference, and if `docs/api/` lives in Git (needed by 6.1).
- [ ] 8.6 Decide if the shape of the archive of the logs belongs in the package, because it has no consumer in the frontend today.
- [ ] 8.7 Decide the final name of the package, between `@gitopslovers/contracts` and `@gitopslovers/gitpaas-contracts` (needed by 1.2).

## 9. The records that the change leaves behind

- [ ] 9.1 Record in `docs/monorepo-architecture.md` that the names of the workspace hold two slashes and are no valid names of a package, and that the package of the contracts therefore holds one.
- [ ] 9.2 Record in `docs/monorepo-architecture.md` the new file `turbo.json` and the order of its tasks.
