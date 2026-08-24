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

- **`core/`** holds only the **structural elements that make the application operate**: the configuration and the environment validation, the database connection, the container runtime, the secret cipher, the global exception filter and the application logging. `core/` obeys the same four layers as a feature (see below).
- **`features/`** is the default location. If an element is part of one business domain, it stays in the feature of that domain and in no other place.
- **`shared/`** holds **the reusable functions that are not structural and that are not part of one domain**, for example the password hasher that several features use. `shared/` is layered too, but only as far as the code needs.

## The four layers

Each feature has four different layers. There is one strict rule: **an outer layer can depend on an inner layer, but an inner layer can never depend on an outer layer.**

The same rule holds above a feature: **`core/` must never import a feature.** `core/` gives the structure that every feature uses, so a dependency in that direction inverts the layering of the whole application.

**Domain Layer**

This layer holds the models, the repository and port interfaces, the DTOs, the errors and all the other elements that give the business model. These elements do not depend on the other layers and do not use a specified technology. The DTOs are the only exception, because they use `class-validator`.

**Application Layer**

This layer holds all the business use cases. Each use case has its own file and obeys the single-responsibility principle. A use case is a pure function that receives all its dependencies as parameters. Thus a use case knows only the elements of the domain layer. A contract of the wire is the one exception: a use case may import a type of `@gitpaas/contracts` directly, because that package depends on `zod` alone and imports nothing from `apps/`, so it pulls no framework into the layer.

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
    models/<entity>.models.ts               — Domain types for the entity
    dtos/create-<entity>.dto.ts             — Validated input contract
    repositories/<feature>.repository.ts    — Aggregate-collection port
    ports/<collaborator>.port.ts            — Every other driven port
    errors/<feature>.errors.ts              — Domain error classes
  application/
    <verb>-<entity>.use-case.ts             — One pure function per business operation
  infrastructure/
    <technology>/
      db-<entity>.entity.ts                 — ORM entity
      <technology>-<feature>.repository.ts  — Implementation of a repositories/ interface
      <stem>.transformer.ts                 — Persistence/vendor shape ◄► domain model
  ui/
    controllers/                            — HTTP entry point
    services/                               — Orchestration and dependency declaration
    guards/                                 — Route-level checks, opt-in per controller or handler
```

For example, the `projects` feature fills this shape with a `Project` model, a `ProjectsRepository` port, a `createProjectUseCase`, and a `DbProjectEntity`. A controller usually declares only the path of its own resource; a nested resource is the exception, such as `@Controller('namespaces/:namespaceId/projects')` for a project that never exists outside its namespace.

A feature can have fewer folders than the shape above when it does not need them: `containers` and `networks` read from Docker only and keep no database table, so they have no `infrastructure/database` folder; `users` exposes no HTTP route of its own, so it has no `ui/controllers` folder. The name of an infrastructure sub-folder is the name of the technology or the vendor that it holds (`database`, `docker`, `github`).

## Module wiring

Each feature declares its dependencies in its own module: the `controllers`, the `services`, the `guards` and the related infrastructure implementations. Thus the logic stays in one location.

If an element is necessary in the other features (for example, a repository that gives access to the database), the module declares the element in the `exports` key.

## Testing

Jest runs the whole suite from `apps/backend/jest.config.js`. A test file stays next to the layer it covers, in a `__tests__/<name>.spec.ts` file at the side of the file it tests, so a reader finds the test of a file in the same folder. The end-to-end suite has its own configuration, `test/jest-e2e.json`, and runs with the separate `test:e2e` script.

## Cross-cutting concerns

Some behaviours apply to all the application. Thus they are configured one time at the root and are not repeated on each endpoint.

- **Authentication**: a global JWT guard protects all the routes by default. A request must be authenticated, if the route does not have a different mark. The `@Public()` decorator removes a route from this rule.
- **Authorization**: role-based access control is opt-in, not global. A controller adds `@UseGuards(RolesGuard)` and marks the routes it wants to close with `@Roles(UserRole.Admin)`; a route with no `@Roles(...)` stays open to each authenticated user. See [Roles](./key-flows.md#roles).
- **Rate limiting**: named throttlers are read from the environment and apply globally by default. An endpoint can change these values locally, for example to give the login endpoint a stricter limit or to give a long-lived stream its own throttler.
- **Security headers**: `helmet()` sets the secure HTTP headers at bootstrap.
- **Environment validation**: a `class-validator` schema validates each variable when the application starts. If a variable is missing or incorrect, the application stops immediately.
- **Request correlation id**: a global middleware gives an id to each request. It uses the inbound `X-Request-Id` header or makes a new id, and it returns the id in the `X-Request-Id` response header.
- **Error envelope**: a global exception filter returns the same shape for all the errors. See [Error handling](./key-flows.md#error-handling).
- **Telemetry**: a global middleware opens a telemetry scope for each request, every layer adds fields to it, and one JSON event goes to stdout when the response finishes. See [Telemetry and logging](./key-flows.md#telemetry-and-logging).
