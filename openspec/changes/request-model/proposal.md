## Why

GitPaaS has one producer of the HTTP contract (the NestJS API) and one consumer (the Angular application),
in the same repository. The two applications describe the same shapes of the wire **two times**, in two sets
of hand-written files that no tool compares. There is no OpenAPI specification, because `@nestjs/swagger` is
no dependency of the backend.

Today a human keeps the two sides equal, in one pull request. That method has already failed. Five
disagreements sit in `main` at this moment:

1. **`Service` — the optionality is the opposite, in four fields.** The backend makes `repositoryId`,
   `deploymentBranch` and `composerPath` obligatory. The frontend makes the same three optional. The fourth
   field is worse: the backend declares `providerId: string | null`, and the frontend declares
   `providerId?: string`. One is a value that is empty, and the other is a key that is absent. JSON carries
   the two in different ways, and the compiler cannot say which one the API sends.
2. **`LogEvent` — the union of the frontend is not complete.** The backend sends three kinds of event on the
   stream. The frontend declares two. The compiler cannot find this, because the code ends with a cast on
   data of the network, at `deployments-api.repository.ts:181`.
3. **`User` — three names for one shape.** The backend holds an enum and a `User` with the hash of the
   password. The layer of the UI of the backend holds `AuthenticatedUser`, which removes that hash. The
   frontend holds a union of two texts and a third `User`. The frontend asks the endpoint of the profile for
   its own shape, and the backend answers with another one.
4. **The readiness of the server — the gap closed itself, by a copy.** When this change was written, the
   frontend had no model of the readiness and none of the state of the daemon. It has them now. The file
   `readiness-result.model.ts` of the frontend holds the same text as `readiness-result.models.ts` of the
   backend, word for word. Nothing compares the two, and nothing keeps them equal. The gap did not close. It
   became a duplication, and this is the exact failure that this change exists to stop.
5. **`Provider` — the newest feature repeats every pattern.** The backend declares `enum ProviderType`, and
   the frontend declares the text `'github_app'`. The backend answers with `createdAt` and `updatedAt`, and
   the model of the frontend declares neither, so the two fields arrive and no consumer knows them. And
   `ProviderCredentials` holds `privateKey`, a secret inside a domain model, in the same way that `User`
   holds the hash of the password.

A `Date` in a model of the backend is a sixth, quieter case: JSON writes it as a text, so the return type of
the controller does not describe the wire at all. Nine models of the backend carry one.

Prose cannot repair this. A document that lists the fields would be a further artifact to keep equal, and it
would go out of step for the same reason. The failure is not a failure of knowledge. It is a failure of
enforcement. Only a shared artifact that the compiler reads can enforce it.

## What Changes

One new package of the workspace, `packages/contracts`, holds the shape of every request and every answer as
a Zod schema. A schema gives two things from one artifact: a validator at run time, and a static type. The
backend validates with it, and the frontend derives its types from it.

The change delivers the third kind of the event of the stream **first**, in one pull request of its own,
ahead of the package. That delivery closes a defect that the user sees today: the window of the output
treats every event that is no line as an event of the end, so an event of the error sets the final status to
a value that is not defined, and the user reads no cause.

- **New:** the package of the contracts, with one folder per feature, whose name agrees with the feature of
  the backend and of the frontend.
- **New:** a small pipe of validation in the backend, which binds a schema to a parameter of the body.
- **New:** a step of the check of the types in the workflow of the pull request. That workflow runs the
  lint, the tests and the build today, and none of the three finds a disagreement of the two applications.
- **New:** a generated OpenAPI specification, which lives in Git, and an HTML reference that a reader opens.
- **Changed:** the thirteen data transfer objects that a body binds go away. A consumer of any layer
  imports the type of the package directly, because an alias in the domain decouples nothing.
- **Changed:** `turbo.json`, which exists, receives the tasks `check-types`, `generate:openapi` and
  `generate:docs`, and the order that builds the package before the two applications.
- **Changed:** each shape of the wire that the frontend declares goes away, and its consumers point at the
  package.
- **Changed:** a timestamp becomes a text of the ISO form in the contract. The domain of the backend keeps
  its `Date`, and a transformer of the answer converts at the edge.
- **Removed:** the global pipe of validation, after the last class of a body goes away.

## Capabilities

### Modified Capabilities

- `logs`: the stream declares three kinds of event, and the client parses them against the schema instead of
  a cast. The window of the output shows the code and the safe message of an `error` event, in place of a
  status that is not defined. This is the first delivery of the change.
- `services`: the specification records the true optionality of the three fields of the deployment, which
  the two applications describe in opposite ways today. It also records that `providerId` carries `null`,
  and that it is never absent.
- `auth`: the shape of the profile of the user gets one name, and the hash of the password enters no shape
  of an answer.
- `providers`: the kind of a provider carries one set of values, the two timestamps of a provider enter the
  contract as texts of the ISO form, and the private key enters no shape of an answer.

## Impact

**A new package.** `packages/contracts`, whose one dependency at run time is `zod`. The package imports
nothing from `apps/`, so it can never pull NestJS into the frontend, or Angular into the backend.

**The backend.** A new pipe under `core/ui/pipes/`. The thirteen data transfer objects of a body are
deleted, and each consumer imports the type of the package. `domain/dtos/` keeps the ten internal shapes.
A new folder `ui/transformers/` in each feature that holds a timestamp; nine models of the backend carry a
`Date` today. The global pipe goes away at the end. `class-validator` stays, because the
validation of the environment uses it.

**The frontend.** 35 files of the domain describe a shape of the wire today, over twelve features. Each one
that describes the wire goes away. The folder `domain/` stays, for a shape that only the client has. The
parse of the stream replaces a cast, and the window of the output handles the third kind of event.

**The build.** `turbo.json` receives three tasks and the order that they need. A script `check-types` in the
two applications. Three new gates in `.github/workflows/pr-verify.yml`: the check of the types, the proof
that the specification is current, and a report of the changes that break a consumer.

**The dependencies.** `zod` (version 4) in the package. A generator of OpenAPI and a builder of the HTML
reference, at the time of the phase that needs them. Nothing is installed yet. The rules of the project
forbid an agent to install a dependency, so the user installs each one.

**No client is generated.** The consumer is Angular, and it must use `HttpClient` and `httpResource` to keep
the interceptor, the rotation of the token and the signals of the resource. A generated client of `fetch`
would go around all of that.

**One folder is dead, and this change does not delete it.** `apps/frontend/src/app/features/source-control/`
holds five shapes of the wire, and no file outside the folder imports it. The feature `providers` replaced
it. Its deletion is a pure refactor, and it belongs to a separate change.
