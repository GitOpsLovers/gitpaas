# Request model plan — ship types, not docs

This document is an **implementation proposal**. It gives a plan to make the HTTP contract of GitPaaS a
**single typed artefact** that `apps/backend` and `apps/frontend` both derive from. Nothing in this document
is implemented yet.

The plan applies the idea of the essay *Ship Types, Not Docs* (Boris Tane): an API contract must be an
**executable contract**, and not prose. You define the shape one time in a schema language, and you generate
the TypeScript types, the OpenAPI specification and the documentation from it. Prose can drift from the
implementation, because a human must synchronize two separate artefacts. A schema cannot drift, because the
compiler and the validator both read it.

For the layers and the conventions that the plan obeys, see [backend architecture](./backend-architecture.md)
and [frontend architecture](./frontend-architecture.md). For the task pipeline, see
[monorepo architecture](./monorepo-architecture.md).

---

## 1. Context and problem

GitPaaS has one producer (the NestJS API) and one consumer (the Angular SPA) in the same repository. The two
applications describe the same wire shapes **two times**, in two hand-written files that no tool compares.
There is no OpenAPI specification: `@nestjs/swagger` is not a dependency of `apps/backend`. Thus nothing —
not a schema, not a generated client, not a test — makes the two descriptions agree.

Today the agreement is kept by a human who edits both sides in the same pull request. That method has already
failed. Section 2 gives the failures that are in the repository at this moment.

---

## 2. Current state

### 2.1 How the backend declares its contract

A backend endpoint declares its contract with **three separate TypeScript artefacts**:

- The **input** is a `class-validator` class in `domain/dtos/`, bound with `@Body()`. The global
  `ValidationPipe` in `apps/backend/src/bootstrap.ts` applies it with `whitelist: true`,
  `forbidNonWhitelisted: true` and `transform: true`. Thus the DTO class is the authoritative input contract.
  Seven DTO classes are bound to a body today, in four controllers (the projects, the services, the
  deployments and the authentication controllers).
- The **path and query values** are validated by built-in pipes, not by a DTO — `ParseUUIDPipe` for each
  `:id` segment and for the `serviceId` / `deploymentId` query parameters, and `ParseIntPipe` for the
  repository identifier in `apps/backend/src/features/source-control/ui/controllers/source-control.controller.ts`.
- The **output** is only the **return type** of the controller method, for example
  `Promise<Project[]>` in `apps/backend/src/features/projects/ui/controllers/projects.controller.ts`.
  There is no run-time description of the response and no schema. The type points at the **domain model**
  (`domain/models/<entity>.models.ts`), which is not always the shape that goes on the wire.

Two response shapes are declared in no model file at all:

- `ContainerRuntimeInfo & { connected: boolean }`, the inline return type of `getStatus()` in
  `apps/backend/src/features/server/ui/controllers/server.controller.ts`.
- `AuthenticatedUser`, which is `Omit<User, 'passwordHash'>` and is declared in
  `apps/backend/src/features/authentication/ui/services/authentication.service.ts`, that is, in the UI layer
  and not in the domain layer.

The error response has one shape for all the API, the `ErrorEnvelope` interface in
`apps/backend/src/core/ui/filters/all-exceptions.filter.ts`. That interface is **not exported**. Thus no
consumer can use it.

The SSE contract of the log stream is declared in
`apps/backend/src/features/logs/domain/models/log-event.models.ts` (`LogEvent = LogLineEvent | LogEndEvent |
LogErrorEvent`) and is JSON-encoded by hand in the controller
(`map((event) => ({ data: JSON.stringify(event) }))`).

### 2.2 How the frontend consumes the contract

Each feature has one `@Injectable()` repository in `infrastructure/api/`. The repository gives the wire shape
as a **type argument that the developer writes by hand**:

```ts
// apps/frontend/src/app/features/projects/infrastructure/api/projects-api.repository.ts
public readonly projects = httpResource<Project[]>(() => this.url);

public create(dto: CreateProjectDto): Observable<Project> {
    return this.http.post<Project>(this.url, dto);
}
```

`httpResource<T>` and `HttpClient.post<T>` do **no** validation. The type argument is an assertion: the
compiler believes it, and the browser accepts whatever JSON arrives. Thus a change of the backend shape gives
no compilation failure and no run-time failure — it gives `undefined` in a template.

The frontend re-declares each shape in `features/<feature>/domain/models/<entity>.model.ts` and
`features/<feature>/domain/dtos/<action>-<entity>.dto.ts`. There are 17 such files today, and each one has a
twin in `apps/backend/src/features/`.

The frontend has **no** type for the error envelope. A search for `statusCode` or `requestId` in
`apps/frontend/src` gives no result. The only error handling that reads the response is
`apps/frontend/src/app/features/authentication/ui/interceptors/auth.interceptor.ts`, and it reads only
`error.status === 401`.

### 2.3 The duplication and the drift that exist today

**The duplication.** Where the shape agrees, the two files are a copy, sometimes with the same comment text:

| Wire shape       | Backend                                                            | Frontend                                                                      |
|------------------|--------------------------------------------------------------------|-------------------------------------------------------------------------------|
| `Project`        | `features/projects/domain/models/project.models.ts`                | `features/projects/domain/models/project.model.ts`                            |
| `CreateProjectDto` | `features/projects/domain/dtos/create-project.dto.ts` (class)    | `features/projects/domain/dtos/create-project.dto.ts` (interface)             |

The `Project` interface is identical, character for character, in the two files. The `CreateProjectDto` is the
same shape written two times in two languages: `@IsString() @IsNotEmpty() name!: string` on one side, and
`name: string` on the other side. The frontend copy holds **no** rule, so the browser cannot know that an empty
name is not valid.

**The drift.** The copies are already not equal. Each item below is in `main` today:

1. **`Service` — the optionality is the opposite.**
   `apps/backend/src/features/services/domain/models/service.models.ts` makes `repositoryId`,
   `deploymentBranch` and `composerPath` **required**.
   `apps/frontend/src/app/features/services/domain/models/service.model.ts` makes the same three fields
   **optional**. One of the two files is incorrect, and the compiler cannot say which one.

2. **`Date` against `string` — the serialization is not modelled.**
   The backend models hold `createdAt: Date` (`deployment.models.ts`, `container.models.ts`,
   `network.models.ts`, `user.models.ts`, `log-entry.models.ts`). A `Date` is JSON-encoded as an ISO string.
   Thus the backend return type does **not** describe the wire. The frontend twins compensate with
   `createdAt: string`. The compensation is correct, but it is invisible: nothing connects the two decisions,
   and the next model that gets a `Date` will be copied with a `Date`.

3. **`User` — two different type constructions.**
   The backend has `enum UserRole { Admin = 'admin', User = 'user' }` and a `User` that holds `passwordHash`.
   The frontend has `type UserRole = 'admin' | 'user'` and a `User` with no `passwordHash`. The endpoint
   `GET /api/v1/auth/me` returns `AuthenticatedUser` (`Omit<User, 'passwordHash'>`), and the frontend types
   the same call as `User`. Three names, one shape.

4. **`LogEvent` — the frontend union is not complete, and this is a live defect.**
   The backend can send three event types on the SSE stream; the error event was added with the error-handling
   overhaul. `apps/frontend/src/app/features/logs/domain/models/log-event.model.ts` declares only two:

   ```ts
   export type LogEvent =
       | { type: 'line'; data: string }
       | { type: 'end'; status: 'success' | 'failed' };
   ```

   In `apps/frontend/src/app/features/services/ui/components/deployment-logs-modal/deployment-logs-modal.component.ts`
   the subscriber tests `event.type === 'line'` and treats **each other event** as an end event
   (`this.finalStatus.set(event.status)`). An `error` event has no `status` field. Thus the modal sets the
   final status to `undefined` and shows no cause, although the backend sent a code and a safe message on
   purpose. The compiler cannot find this, because `parseSseEvent` ends with
   `JSON.parse(...) as LogEvent` — a cast on data that comes from the network.

5. **A response shape that the frontend cannot import.**
   `GET /api/v1/server/readiness` and `GET /api/v1/server/status` have no frontend model
   (`features/server/domain/models/` holds only the two prune results). The error envelope has no frontend
   model either.

**Why prose cannot repair this.** A document that lists the fields of `Service` would be a fourth artefact to
synchronize, and it would drift for the same reason as the third one. The failure above is not a failure of
knowledge; it is a failure of **enforcement**. Only a shared artefact that the compiler reads can enforce it.

---

## 3. The proposed model

### 3.1 One contract package

Add the first shared workspace package. `pnpm-workspace.yaml` already declares `packages/*`, so the directory
only has to exist.

```text
packages/contracts/
  package.json
  tsconfig.json
  src/
    index.ts                       — the public barrel
    shared/
      error-envelope.contract.ts   — the envelope that every failed request returns
      endpoint.contract.ts         — the EndpointDescriptor type used by every endpoint map
    projects/
      project.contract.ts          — the schemas and the inferred types
      projects.endpoints.ts        — the route descriptors
    services/
    deployments/
    logs/
    authentication/
    …
  openapi/
    openapi.json                   — generated, committed
```

The folder for each feature has the **same name as the backend feature and as the frontend feature**. Thus a
person who works on one slice opens one folder in each of the three places. The file suffix is
`.contract.ts`, which agrees with the artefact-suffix rule of the backend naming convention.

### 3.2 The schema tool: Zod

**Recommendation: Zod (v4).** The reasons are specific to this repository:

- **One artefact gives the two things that GitPaaS needs.** A Zod schema is a run-time validator **and** a
  static type through `z.infer`. `class-validator` gives only the validator, and a plain interface gives only
  the type. That is exactly why there are two files today.
- **It operates in the browser.** A `class-validator` DTO is a class with decorators. It needs
  `experimentalDecorators`, `emitDecoratorMetadata` and `reflect-metadata`, and it must stay a class at run
  time. `apps/frontend` has none of that and must not get it. A Zod schema is a plain value.
- **The frontend pays nothing if it wants only the type.** `import type { Project } from …` is erased at
  build. The Zod run time enters the bundle only where the frontend chooses to parse.
- **It generates the rest.** A Zod schema converts to JSON Schema and to OpenAPI, which gives the
  specification and the HTML reference of section 6.
- **It keeps the current strictness.** `z.strictObject` rejects an unknown property, which is the behaviour
  that `forbidNonWhitelisted: true` gives today.

Alternatives that the plan does not take:

- **`@nestjs/swagger` with the existing `class-validator` DTOs.** This produces an OpenAPI specification, but
  the contract stays in the backend. The frontend still copies the shapes by hand, or it consumes a
  **generated** client that a second toolchain makes from the specification. The essay names the schema, and
  not the specification, as the source of truth. The specification is a generated artefact.
- **Protocol Buffers.** The transport is JSON over HTTP with SSE, and the consumer is a browser. Protobuf adds
  a compiler, a build step and a wire format that gives no advantage here.

### 3.3 What the package holds, and how the two applications derive from it

One worked example, the `projects` feature, which the other documents already use as the reference:

```ts
// packages/contracts/src/projects/project.contract.ts
import { z } from 'zod';

/** A project groups the services of one scope. */
export const projectSchema = z.object({
    id: z.uuid(),
    name: z.string().min(1),
    servicesCount: z.number().int().nonnegative().optional(),
});

/** Body accepted by `POST /projects`. */
export const createProjectSchema = z.strictObject({
    name: z.string().min(1),
});

/** Body accepted by `PUT /projects/:id`. */
export const updateProjectSchema = createProjectSchema;

export type Project = z.infer<typeof projectSchema>;
export type CreateProjectDto = z.infer<typeof createProjectSchema>;
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
```

The package also holds the **endpoint map**: the method, the path, the body schema and the response schema of
each route. The map is the machine-readable index that the OpenAPI generator walks, and it is the place where
a path and a status code stop being a string that two applications write two times.

```ts
// packages/contracts/src/projects/projects.endpoints.ts
export const projectsEndpoints = {
    list:   { method: 'GET',    path: '/projects',     response: z.array(projectSchema) },
    byId:   { method: 'GET',    path: '/projects/:id', response: projectSchema },
    create: { method: 'POST',   path: '/projects',     body: createProjectSchema, response: projectSchema },
    update: { method: 'PUT',    path: '/projects/:id', body: updateProjectSchema, response: projectSchema },
    remove: { method: 'DELETE', path: '/projects/:id', status: 204 },
} as const satisfies EndpointMap;
```

Two rules keep the package honest:

- **The package describes the wire, and not the database and not the domain.** A timestamp is
  `z.iso.datetime()`, that is, a `string`. A domain model in `apps/backend` can keep its `Date`; the UI layer
  converts (section 4.3). A secret never enters a response schema, so `passwordHash` is not in the package.
- **The package imports nothing from `apps/`.** Its only run-time dependency is `zod`. Thus it can never pull
  NestJS or Angular into the other application.

---

## 4. Backend integration

### 4.1 Validation with a small pipe

Add one pipe to the core UI layer, `apps/backend/src/core/ui/pipes/zod-validation.pipe.ts`:

```ts
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform {
    constructor(private readonly schema: ZodType<T>) {}

    public transform(value: unknown): T {
        const result = this.schema.safeParse(value);

        if (!result.success) {
            throw new BadRequestException(result.error.issues.map(toValidationMessage));
        }

        return result.data;
    }
}
```

`toValidationMessage` gives one string for each issue (`"name must contain at least 1 character"`). Thus the
thrown `BadRequestException` carries a **`message` array**, exactly as the current `ValidationPipe` does.
`AllExceptionsFilter.extractMessage` keeps a message array with no change, so the error envelope that the
client reads does not change at all. No frontend change is necessary for the validation failures.

The controller binds the schema on the parameter:

```ts
@Post()
public create(
    @Body(new ZodValidationPipe(createProjectSchema)) createDto: CreateProjectDto,
): Promise<Project> {
    return this.service.create(createDto);
}
```

### 4.2 What happens to the DTO classes and to the global pipe

- **The seven HTTP-bound DTO classes become inferred types.** The file in `domain/dtos/` stays, with its name
  and its JSDoc, and becomes a re-export:
  `export type { CreateProjectDto } from '@gitopslovers/contracts';`. Thus each existing import in the feature
  continues to operate and the domain layer keeps its vocabulary. Their `__tests__` specs, which today build a
  class and call `validate()`, become specs of the schema (`createProjectSchema.safeParse(...)`).
- **The internal DTOs do not move.** `create-deployment.dto.ts`, `create-log.dto.ts`, `create-user.dto.ts`,
  `create-refresh-token.dto.ts`, `seed-admin.dto.ts`, `core/domain/dtos/remove-container.dto.ts` and
  `remove-image.dto.ts` are never bound with `@Body()`. They are internal shapes between the layers, and not a
  wire contract. They stay as they are. The plan makes the wire public, and not each type of the application.
- **The global `ValidationPipe` stays until the last HTTP DTO class has moved.** During the migration the two
  systems live together with no conflict: the Nest `ValidationPipe` validates only when the parameter metatype
  is a class. An inferred type erases to `Object`, so the pipe passes it through and the local Zod pipe is the
  only validator. There is no double validation. When the last class is gone, remove the
  `useGlobalPipes(new ValidationPipe(...))` call from `apps/backend/src/bootstrap.ts`.
- **`class-validator` stays a dependency.** `apps/backend/src/core/infrastructure/config/env-validation.config.ts`
  validates the environment with it. Moving the environment validation to Zod is a separate decision
  (section 9).
- **The parameter pipes stay.** `ParseUUIDPipe` and `ParseIntPipe` are one line and do the same work as a
  schema. Use the Zod pipe for a query object with more than one field, and not for a single identifier.

### 4.3 The response side

The controller return type becomes the contract type. Where the domain model and the wire shape are equal (for
example `Project`), the controller imports the type from the package and nothing else changes.

Where they are **not** equal, the difference becomes explicit at the UI edge, and not implicit in
`JSON.stringify`. This applies to each model that holds a `Date` and to `AuthenticatedUser`. Use the existing
transformer convention of the repository, in a new folder `ui/transformers/`:

```text
features/deployments/ui/transformers/deployment-response.transformer.ts
    toDeploymentResponse(deployment: Deployment): DeploymentResponse
```

The contract type is imported with an alias where the domain model has the same name
(`import type { Deployment as DeploymentResponse } from '@gitopslovers/contracts';`). Thus the compiler, and
not a reader, proves that the ISO conversion occurs.

The backend does **not** validate its own responses at run time. The compiler already proves the shape, and a
parse for each response costs time in the hot path. Section 9 keeps a development-only check as an open item.

---

## 5. Frontend integration

### 5.1 The repositories consume the package

`apps/frontend/package.json` declares `"@gitopslovers/contracts": "workspace:*"`. The repository imports the
type and deletes its local twin:

```ts
import type { CreateProjectDto, Project, UpdateProjectDto } from '@gitopslovers/contracts';

public readonly projects = httpResource<Project[]>(() => this.url);
```

Nothing in the structure of the repository changes: a read is still an `httpResource`, a mutation is still a
thin `HttpClient` method that returns an `Observable`, and a container still gives the repository. The change
is only the **origin of the type**.

### 5.2 Parse where the data is not trusted

A type argument is an assertion. Where a wrong shape gives a silent failure, the frontend can parse the payload
with the same schema:

- **A read** uses the `parse` option of `httpResource`:
  `httpResource(() => this.url, { parse: (raw) => z.array(projectSchema).parse(raw) })`. The resource then
  reports a schema failure through its own `error()` signal, which each list container already shows.
- **The SSE stream** is the one place where a parse is necessary and not optional. Today
  `parseSseEvent` ends with `JSON.parse(dataLines.join('\n')) as LogEvent`. It becomes
  `logEventSchema.parse(...)`, with the **complete** three-variant union from the package. The
  `deployment-logs-modal` component then cannot compile until it handles the `error` variant, which removes
  the defect of section 2.3.

For a plain form payload, the type alone is sufficient and the schema stays out of the bundle. Import the
schema value only where you parse; import the type in each other place with `import type`.

### 5.3 What happens to the frontend models

The 17 files in `features/*/domain/models/` and `features/*/domain/dtos/` that describe a **wire** shape are
deleted, one feature at a time, and their imports point at `@gitopslovers/contracts`. The `domain/` folder of a
frontend feature does not disappear: it remains the correct place for a shape that is **only** of the client,
for example a view model or a form state that no endpoint returns. The rule after the migration is: **if the
backend produces or consumes the shape, the shape lives in the contract package.**

The frontend gains two types that it never had: the error envelope and the readiness result. With the
envelope typed, the interceptor and the containers can read `code` — the stable identifier that the error
handling was built to give — in place of a status number.

---

## 6. Generated artefacts and the Turborepo tasks

The repository has **no `turbo.json`** at the root today, so `turbo run <task>` operates with no pipeline, no
task dependency and no cache. The plan needs an order (`contracts` builds before its consumers), so the file
must be added:

```jsonc
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build":            { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "check-types":      { "dependsOn": ["^build"] },
    "test":             { "dependsOn": ["^build"] },
    "lint":             {},
    "generate:openapi": { "dependsOn": ["build"], "outputs": ["openapi/**"] },
    "generate:docs":    { "dependsOn": ["generate:openapi"], "outputs": ["../../docs/api/**"] },
    "dev":              { "cache": false, "persistent": true }
  }
}
```

| Artefact                     | Produced by                                        | Task                                    | Output                                      |
|------------------------------|-----------------------------------------------------|-----------------------------------------|---------------------------------------------|
| The TypeScript types         | `tsc` in the contract package (declarations)        | `contracts#build`                       | `packages/contracts/dist/**`                |
| The OpenAPI 3.1 specification | A script that walks the endpoint maps and converts each schema | `contracts#generate:openapi` | `packages/contracts/openapi/openapi.json`   |
| The HTML API reference       | A static site builder that reads the specification  | `contracts#generate:docs`               | `docs/api/index.html`                       |
| The typed "SDK"              | The package itself (the endpoint maps + the types)  | `contracts#build`                       | consumed with `workspace:*`                 |
| The type check of a consumer | `tsc --noEmit` (backend) / `ng build` (frontend)    | `backend#check-types`, `frontend#check-types` | none (this is the gate of section 7) |

Two notes on the artefacts:

- **The specification is committed.** `packages/contracts/openapi/openapi.json` is a generated file that lives
  in Git, so a reviewer sees the wire change in the diff of the pull request and CI can prove that the file is
  current (section 7).
- **There is no generated HTTP client.** The essay generates an SDK, but the consumer here is Angular, and it
  must use `HttpClient` and `httpResource` to get the `authInterceptor`, the refresh rotation and the resource
  signals. A generated `fetch` client would go around all of that. The endpoint maps plus the inferred types
  give the same guarantee — a wrong path, a wrong body or a wrong response type does not compile — with none
  of the loss. For the same reason the plan does **not** adopt the RPC step of the essay: GitPaaS has no
  service-to-service traffic to convert.
- **The generation script runs the compiled output** (`node dist/scripts/generate-openapi.js`), so it needs no
  TypeScript run-time dependency.

The root `check-types` script already exists in `package.json` and no application implements it. The plan
gives it a body: `tsc -p tsconfig.json --noEmit` in `apps/backend`, and an Angular build in `apps/frontend`,
because `strictTemplates` is on and only the Angular compiler checks a template.

---

## 7. CI enforcement

`.github/workflows/pr-verify.yml` runs `pnpm install --frozen-lockfile`, then `pnpm run lint` and
`pnpm run test`. It never compiles the backend and never builds the frontend. Thus a type failure passes CI
today. The plan adds three gates, in this order:

1. **`pnpm run check-types`.** This is the gate that the essay describes: a schema change that breaks a
   consumer **cannot compile**. If you make `Service.repositoryId` required in the contract, each frontend
   component that treats it as optional fails; if you remove a field, each backend transformer that fills it
   fails. Turborepo builds `packages/contracts` first, because of `dependsOn: ["^build"]`, so the two
   applications always check against the new schema and never against a stale `dist/`.
2. **The specification is current.** Run `pnpm run generate:openapi` and then
   `git diff --exit-code packages/contracts/openapi`. A non-empty diff fails the job. Thus a schema change
   whose author did not regenerate the specification cannot merge, and the published contract is never behind
   the code.
3. **The breaking change is visible.** Compare the specification of the branch with the specification of
   `main` and publish the report in the pull request. A breaking change is permitted — it must only be
   deliberate.

Two useful additions to the same workflow: run the tasks with `--filter=...[origin/main]`, so a change inside
`packages/contracts` automatically pulls the two dependent applications into the run, and keep the existing
`lint` and `test` steps with no change.

---

## 8. Migration plan

Each phase is small, is independently mergeable and leaves `main` green. No phase requires the next phase.

### Phase 0 — The rails

Create the package and the pipeline. No application changes.

- New: `turbo.json`, `packages/contracts/{package.json,tsconfig.json,src/index.ts}`.
- New: `packages/contracts/src/shared/endpoint.contract.ts`.
- Edit: `apps/backend/package.json` and `apps/frontend/package.json` — add the `check-types` script.
- Edit: `.github/workflows/pr-verify.yml` — add the `check-types` step (gate 1).

### Phase 1 — The reference slice: `projects`

The smallest complete vertical slice, and the example that all the documents use.

- New: `packages/contracts/src/projects/{project.contract.ts,projects.endpoints.ts}`.
- New: `apps/backend/src/core/ui/pipes/zod-validation.pipe.ts` (+ its spec).
- Edit: `apps/backend/src/features/projects/ui/controllers/projects.controller.ts`,
  `domain/dtos/create-project.dto.ts`, `domain/dtos/update-project.dto.ts` and their `__tests__`.
- Delete: `apps/frontend/src/app/features/projects/domain/{models/project.model.ts,dtos/*.dto.ts}`; point the
  repository, the containers and the components at the package.

### Phase 2 — The wire shape of a timestamp

Make the `Date`-to-ISO conversion explicit before the features that hold a timestamp move.

- New: `apps/backend/src/features/deployments/ui/transformers/deployment-response.transformer.ts` and the
  equivalent for the containers, the networks, the users and the log entries.
- Edit: the applicable controllers, to return the transformed shape.
- The domain models keep their `Date`. Nothing in the frontend changes, because the wire already carries an
  ISO string; this phase only makes the compiler agree with the wire.

### Phase 3 — The remaining features, one pull request for each

`services` first, because it holds the optionality drift of section 2.3 and the decision must be recorded in
one schema. Then `deployments`, `authentication` + `users` (which resolves the `User` / `AuthenticatedUser` /
`UserRole` triple), `source-control`, `server` (which adds the readiness and status shapes that the frontend
never had), `containers` and `networks`.

- Per feature: new `packages/contracts/src/<feature>/`, edited backend controller and DTOs, deleted frontend
  `domain/` twins.

### Phase 4 — The shapes that only one side has

- New: `packages/contracts/src/shared/error-envelope.contract.ts`, from the unexported `ErrorEnvelope`
  interface of `apps/backend/src/core/ui/filters/all-exceptions.filter.ts`; the filter imports it.
- New: `packages/contracts/src/logs/log-event.contract.ts`, with the **three** variants.
- Edit: `apps/frontend/src/app/features/deployments/infrastructure/api/deployments-api.repository.ts` —
  `parseSseEvent` parses with the schema.
- Edit: `apps/frontend/.../deployment-logs-modal.component.ts` — handle the `error` variant. **This phase
  fixes a live defect.**

### Phase 5 — The generated artefacts

- New: `packages/contracts/src/scripts/generate-openapi.ts`, the `generate:openapi` and `generate:docs`
  scripts, and the committed `packages/contracts/openapi/openapi.json`.
- Edit: `turbo.json`, `.github/workflows/pr-verify.yml` (gates 2 and 3).
- New: `docs/api/` (generated) and a link from `README.md`.

### Phase 6 — Remove the old machinery

- Edit: `apps/backend/src/bootstrap.ts` — remove `useGlobalPipes(new ValidationPipe(...))`.
- Verify that no `@Body()` parameter is a class any more.
- `class-validator` stays for the environment validation.

---

## 9. Trade-offs and open questions

**Trade-offs**

- **A shared package couples the two applications.** Today `apps/backend` and `apps/frontend` can be edited
  and released alone. After the change, a wire change is one commit that touches three packages and that must
  compile in all three. This is the cost of the guarantee, and it is the point of the plan: the failure moves
  from the browser to the pull request.
- **The bundle.** Zod is a run-time dependency. Where the frontend imports only the type, the import is erased
  and the cost is zero. Where it parses, the run time enters the bundle. Parse at the edges that are not
  trusted (the SSE stream, and the reads that a silent `undefined` would break), and not everywhere.
- **The naming convention has an exception.** The workspace names are `@gitopslovers/gitpaas/<app>`, which has
  **two** slashes and is not a valid npm package name. The applications get away with it because nothing
  depends on them by name. The contract package **is** depended on by name, so it must be
  `@gitopslovers/contracts` (or `@gitopslovers/gitpaas-contracts`). This deviation must be recorded in
  `docs/monorepo-architecture.md`.
- **More files for one field.** A new response field is one edit in the schema, and possibly one edit in a
  response transformer. That is more work than an edit of one interface, and it is less work than the two
  edits that the repository needs today — and it cannot be half-done.

**Open questions**

- **Should the response be validated at run time on the server?** A parse for each response finds a
  transformer failure immediately, and costs time in the hot path. A middle option is to parse only when
  `NODE_ENV !== 'production'`. Not decided.
- **Should the environment validation move to Zod?** `env-validation.config.ts` is the last consumer of
  `class-validator` after phase 6. Moving it removes one dependency, but it is not a wire contract and it is
  not part of this problem.
- **Where does the `Service` optionality drift resolve?** The database entity is the evidence, and the answer
  must come from `apps/backend/src/features/services/infrastructure/`. The schema of phase 3 must not copy
  either of the two current opinions before somebody reads the column definitions.
- **How is the endpoint path used?** The plan puts the paths in the endpoint maps, but the frontend
  repositories build their URLs from `environment.apiBaseUrl` with template strings. A typed URL builder that
  reads the map is possible and is a separate step.
- **Which tool builds the HTML reference, and is it committed?** A committed `docs/api/` gives the reader an
  offline artefact and gives the reviewer a large diff. A build-time artefact gives neither.
- **Does the `logs` archive shape (`LogEntry`) belong in the package?** `GET /api/v1/logs?deploymentId=` is a
  public endpoint with no frontend consumer today. It should be in the contract, but nothing enforces it until
  a consumer exists.

---

## 10. New dependencies

Nothing in this list is installed. The user installs what a phase needs when the phase starts.

| Dependency                      | Where                          | Type    | Phase | Purpose                                                    |
|---------------------------------|--------------------------------|---------|-------|-------------------------------------------------------------|
| `zod` (v4)                      | `packages/contracts`           | runtime | 0     | The schema language; the only run-time dependency of the package |
| `@gitopslovers/contracts`       | `apps/backend`, `apps/frontend`| runtime | 1     | The workspace link (`workspace:*`), not an external package |
| An OpenAPI generator for Zod    | `packages/contracts`           | dev     | 5     | Converts the endpoint maps into OpenAPI 3.1. Zod 4 has a native JSON-Schema converter, so a small in-house assembler can remove this dependency |
| An OpenAPI HTML builder         | root                           | dev     | 5     | Builds `docs/api/` from the specification                   |
| An OpenAPI diff tool            | CI only                        | —       | 5     | Gate 3; can run as a GitHub Action with no package in the repository |

No new dependency is necessary for NestJS (the pipe is 15 lines) and none for Angular.

---

## Related docs

- [Backend architecture](./backend-architecture.md) — the layers, the DTO rule and the error envelope
- [Frontend architecture](./frontend-architecture.md) — the API repositories and the `httpResource` rule
- [Monorepo architecture](./monorepo-architecture.md) — the workspace, the tasks and the CI workflow
- [Backend business](./backend-business.md) — the domain words that the schemas use
