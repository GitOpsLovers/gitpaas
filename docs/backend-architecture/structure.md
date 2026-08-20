# Structure

## Top-level source folders

`src/` has three folders at the same level, plus the bootstrap files of the Nest application (`app.module.ts`, `app.controller.ts`, `app.service.ts`, `bootstrap.ts`, `main.ts`). To find the correct folder for a file, think about **who needs the file**, not about what the file does:

```text
src/
  core/
  features/
  shared/
  app.module.ts
  app.controller.ts
  app.service.ts
  bootstrap.ts
  main.ts
```

- **`core/`** holds only the **structural elements that make the application operate**: the configuration and the environment validation, the database connection, the container runtime, the secret cipher, the global exception filter and the application logging. `core/` obeys the same four layers as a feature (see below), so it also has its own `application/`, `domain/{models,ports,dtos,constants,errors}`, `infrastructure/{config,crypto,database,docker,logging,redis,telemetry}` and `ui/{filters,middlewares,translators}` folders.
- **`features/`** is the default location. If an element is part of one business domain, it stays in the feature of that domain and in no other place.
- **`shared/`** holds **the reusable functions that are not structural and that are not part of one domain**. `shared/` is layered too, but only as far as the code needs: it has a `domain/ports` folder for the ports that several features share (for example the password hasher), an `infrastructure/security` folder for the adapter, and its own `shared.module.ts`.

## The four layers

Each feature has four different layers. There is one strict rule: **an outer layer can depend on an inner layer, but an inner layer can never depend on an outer layer.**

**Domain Layer**

This layer holds the models, the repository and port interfaces, the DTOs, the errors and all the other elements that give the business model. These elements do not depend on the other layers and do not use a specified technology. The DTOs are the only exception, because they use `class-validator`.

**Application Layer**

This layer holds all the business use cases. Each use case has its own file and obeys the _single responsibility principle_. A use case is a pure function that receives all its dependencies as parameters. Thus a use case knows only the elements of the domain layer. A contract of the wire is the one exception: a use case may import a type of `@gitpaas/contracts` directly, because that package is no vendor type. The package depends on `zod` alone, and it imports nothing from `apps/`, so it pulls no framework into the layer.

**Infrastructure Layer**

This layer holds all the implementations of the domain ports. Each interface or repository gets its technology here, for example a database or the access to GitHub.

**UI Layer**

This layer is the entry point of the application (the HTTP routes). The `controllers` receive the requests and send them to the `services`. The `services` call the use cases and declare the necessary dependencies.

## Structure of a feature

All the features have the same layout. The names of the layer folders are always singular (`domain`, `application`, `infrastructure`, `ui`). The names of the folders in them are **plural nouns that give the type of the artefact**. This is the standard shape:

```text
features/<feature>/
  <feature>.module.ts                       — Module wiring: controllers, services, adapters, exports
  domain/
    models/
      <entity>.models.ts                    — Domain types for the entity
    dtos/
      create-<entity>.dto.ts                — Validated input contract
      update-<entity>.dto.ts
    repositories/
      <feature>.repository.ts               — Aggregate-collection port
    ports/
      <collaborator>.port.ts                — Every other driven port
    errors/
      <feature>.errors.ts                   — Domain error classes
    utils/
      <stem>.util.ts                        — Pure domain helper, no vendor types
    constants/
      <stem>.constants.ts                   — Domain constants and policy values, no vendor types
  application/
    <verb>-<entity>.use-case.ts             — One pure function per business operation
  infrastructure/
    <technology>/                           — Folder named after the technology or vendor
      db-<entity>.entity.ts                 — ORM entity
      <technology>-<feature>.repository.ts  — Implementation of a repositories/ interface
      <technology>-<port>.adapter.ts        — Implementation of a ports/ interface
      <stem>.transformer.ts                 — Persistence/vendor shape ◄► domain model
  ui/
    controllers/                            — HTTP entry point
    services/                               — Orchestration and dependency declaration
    guards/                                 — Route-level `CanActivate` checks, opt-in per controller or handler
    decorators/                             — Parameter and route metadata decorators (for example `@CurrentUser()`, `@Roles()`)
    telemetry/                              — Feature-specific helpers that enrich the telemetry event with actor or domain fields
```

For example, the `projects` feature fills this shape with a `Project` model, a `ProjectsRepository` port, a `createProjectUseCase`, and a `DbProjectEntity`. The `namespaces` feature follows the same shape one level above it, because a namespace groups projects the same way a project groups services: it has a `Namespace` model, a `NamespacesRepository` port, and its own set of use cases and infrastructure classes.

A controller usually declares only the path of its own resource. A nested resource is the exception: the `projects` controller declares `@Controller('namespaces/:namespaceId/projects')`, because a project never exists outside its namespace, and the nesting makes that rule visible in the route.

Usually, all the features must use this structure for their entities. But a layer can have more elements or fewer elements. `containers`, `networks` and `server` read from Docker only and keep no database table, so they have no `infrastructure/database` folder; `users` exposes no HTTP route of its own (only a service that other features call), so it has no `ui/controllers` folder.

The name of an infrastructure sub-folder is the name of the technology or the vendor that the sub-folder contains (`database`, `docker`, `github`). Besides the file kinds of the tree above, `infrastructure/` can also hold a plain `.module.ts` when the feature needs no dedicated wiring file elsewhere, a `.connection.ts` file for a hand-rolled client connection (for example `redis.connection.ts`), and a `.constants.ts` file for technology-bound constants that stay out of `domain/constants/` because they carry vendor values (for example the Redis stream tuning of the log store). A `.util.ts` file can also live outside `domain/utils/`, next to the infrastructure code it supports, when the helper touches a vendor shape and therefore cannot be a pure domain helper.

## Module wiring

Each feature declares its dependencies in its own module: the `controllers`, the `services`, the `guards` and the related infrastructure implementations. Thus the logic stays in one location.

If an element is necessary in the other features (for example, a repository that gives access to the database), the module declares the element in the `exports.` key.

## Testing

Jest runs the whole suite from `apps/backend/jest.config.js`. A test file stays next to the layer it covers, in a `__tests__/<name>.spec.ts` file at the side of the file it tests (for example `domain/errors/__tests__/domain.error.spec.ts`), so a reader finds the test of a file in the same folder. `test/setup-env.ts` seeds the environment variables that the process needs before a spec runs, and `test/stubs/` holds the hand-written stand-ins for a vendor library (for example `@octokit/rest`), swapped in through `moduleNameMapper`. The end-to-end suite has its own configuration, `test/jest-e2e.json`, and runs with the separate `test:e2e` script.

## Cross-cutting concerns

Some behaviours apply to all the application. Thus they are configured one time at the root and are not repeated on each endpoint.

- **Authentication**: a global JWT guard protects all the routes by default. A request must be authenticated, if the route does not have a different mark. The `@Public()` decorator removes a route from this rule.
- **Authorization**: role-based access control is opt-in, not global. A controller adds `@UseGuards(RolesGuard)` and marks the routes it wants to close with `@Roles(UserRole.Admin)`; a route with no `@Roles(...)` stays open to each authenticated user. See [Roles](./key-flows.md#roles).
- **Rate limiting**: two named throttlers are read from the environment. The `default` throttler applies globally, and the `stream` throttler applies to the long-lived SSE connections. An endpoint can change these values locally. For example, the login endpoint limits itself with `@Throttle` (5 requests in 60 seconds). The log stream removes the `default` throttler with `@SkipThrottle` and applies `@Throttle` on `stream` in its place.
- **Security headers**: `helmet()` sets the secure HTTP headers at bootstrap.
- **Environment validation**: a `class-validator` schema validates each variable when the application starts. If a variable is missing or incorrect, the application stops immediately.
- **Request correlation id**: a global middleware gives an id to each request. It uses the inbound `X-Request-Id` header or makes a new id, and it returns the id in the `X-Request-Id` response header.
- **Error envelope**: a global exception filter returns the same shape for all the errors. It keeps the message arrays that the global `ValidationPipe` and `ZodValidationPipe` make, and it changes an unexpected error into a generic 500.
- **Telemetry**: a global middleware opens a telemetry scope for each request, every layer adds fields to it, and one JSON event goes to stdout when the response finishes.
