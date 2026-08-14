## Why

GitPaaS has one producer of the HTTP contract (the NestJS API) and one consumer (the Angular application),
in the same repository. The two applications describe the same shapes of the wire **two times**, in two sets
of hand-written files that no tool compares. There is no OpenAPI specification, because `@nestjs/swagger` is
no dependency of the backend.

Today a human keeps the two sides equal, in one pull request. That method has already failed. Four
disagreements sit in `main` at this moment:

1. **`Service` — the optionality is the opposite.** The backend makes `repositoryId`, `deploymentBranch` and
   `composerPath` obligatory. The frontend makes the same three optional. One of the two is wrong, and the
   compiler cannot say which one.
2. **`LogEvent` — the union of the frontend is not complete, and this is a live defect.** The backend sends
   three kinds of event on the stream. The frontend declares two. The window of the output treats every
   event that is no line as an end event, so an `error` event sets the final status to `undefined` and the
   user sees no cause. The compiler cannot find this, because the code ends with a cast on data of the
   network.
3. **`User` — three names for one shape.** The backend holds an enum and a `User` with the hash of the
   password. The frontend holds a union of two texts and a `User` without it. The endpoint of the profile
   gives a third type.
4. **Two shapes that the frontend cannot import.** The readiness and the state of the daemon have no model
   in the frontend, and the envelope of the error has none either.

A `Date` in a model of the backend is a fifth, quieter case: JSON writes it as a text, so the return type of
the controller does not describe the wire at all.

Prose cannot repair this. A document that lists the fields would be a further artifact to keep equal, and it
would go out of step for the same reason. The failure is not a failure of knowledge. It is a failure of
enforcement. Only a shared artifact that the compiler reads can enforce it.

## What Changes

One new package of the workspace, `packages/contracts`, holds the shape of every request and every answer as
a Zod schema. A schema gives two things from one artifact: a validator at run time, and a static type. The
backend validates with it, and the frontend derives its types from it.

- **New:** the package of the contracts, with one folder per feature, whose name agrees with the feature of
  the backend and of the frontend.
- **New:** a small pipe of validation in the backend, which binds a schema to a parameter of the body.
- **New:** `turbo.json`, so the package builds before the two applications that read it.
- **New:** a step of the check of the types in the workflow of the pull request. Today that workflow runs
  only the lint and the tests, so a failure of the types passes.
- **New:** a generated OpenAPI specification, which lives in Git, and an HTML reference that a reader opens.
- **Changed:** the seven data transfer objects that a body binds become types that the package infers. The
  file of the domain stays, and it re-exports.
- **Changed:** each shape of the wire that the frontend declares goes away, and its consumers point at the
  package.
- **Changed:** a timestamp becomes a text of the ISO form in the contract. The domain of the backend keeps
  its `Date`, and a transformer of the answer converts at the edge.
- **Removed:** the global pipe of validation, after the last class of a body goes away.

## Capabilities

### Modified Capabilities

- `logs`: the stream declares three kinds of event, and the client parses them against the schema instead of
  a cast. This closes the live defect of the window of the output.
- `web-service-detail`: the window of the output shows the code and the safe message of an `error` event, in
  place of a status that is not defined.
- `services`: the specification records the true optionality of the three fields of the deployment, which
  the two applications describe in opposite ways today.
- `auth`: the shape of the profile of the user gets one name, and the hash of the password enters no shape
  of an answer.

## Impact

**A new package.** `packages/contracts`, whose one dependency at run time is `zod`. The package imports
nothing from `apps/`, so it can never pull NestJS into the frontend, or Angular into the backend.

**The backend.** A new pipe under `core/ui/pipes/`. The seven data transfer objects of a body become
re-exports. A new folder `ui/transformers/` in each feature that holds a timestamp. The global pipe goes
away at the end. `class-validator` stays, because the validation of the environment uses it.

**The frontend.** 17 files of the domain that describe a shape of the wire go away. The folder `domain/`
stays, for a shape that only the client has. The parse of the stream replaces a cast, and the window of the
output must then handle the third kind of event.

**The build.** A new `turbo.json` with the order of the tasks. A script `check-types` in the two
applications. Three new gates in `.github/workflows/pr-verify.yml`: the check of the types, the proof that
the specification is current, and a report of the changes that break a consumer.

**The dependencies.** `zod` (version 4) in the package. A generator of OpenAPI and a builder of the HTML
reference, at the time of the phase that needs them. Nothing is installed yet. The rules of the project
forbid an agent to install a dependency, so the user installs each one.

**No client is generated.** The consumer is Angular, and it must use `HttpClient` and `httpResource` to keep
the interceptor, the rotation of the token and the signals of the resource. A generated client of `fetch`
would go around all of that.
