# Structure

## Top-level source folders

`src/` has three folders at the same level. To find the correct folder for a file, think about **who needs the file**, not about what the file does:

```text
src/
  core/
  features/
  shared/
```

- **`core/`** holds only the **structural elements that make the application operate**: the configuration and the environment validation, the database connection, the container runtime, the global exception filter and the application logging.
- **`features/`** is the default location. If an element is part of one business domain, it stays in the feature of that domain and in no other place.
- **`shared/`** holds **the reusable functions that are not structural and that are not part of one domain**:.

## The four layers

Each feature has four different layers. There is one strict rule: **an outer layer can depend on an inner layer, but an inner layer can never depend on an outer layer.**

**Domain Layer**

This layer holds the models, the repository and port interfaces, the DTOs, the errors and all the other elements that give the business model. These elements do not depend on the other layers and do not use a specified technology. The DTOs are the only exception, because they use `class-validator`.

**Application Layer**

This layer holds all the business use cases. Each use case has its own file and obeys the _single responsibility principle_. A use case is a pure function that receives all its dependencies as parameters. Thus a use case knows only the elements of the domain layer.

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
      <entity>-db.entity.ts                 — ORM entity
      <feature>-<technology>.repository.ts  — Implementation of a repositories/ interface
      <port>-<technology>.adapter.ts        — Implementation of a ports/ interface
      <stem>.transformer.ts                 — Persistence/vendor shape ◄► domain model
  ui/
    controllers/                            — HTTP entry point
    services/                               — Orchestration and dependency declaration
```

Usually, all the features must use this structure for their entities. But a layer can have more elements or fewer elements.

The name of an infrastructure sub-folder is the name of the technology or the vendor that the sub-folder contains (`database`, `docker`, `github`).

## Module wiring

Each feature declares its dependencies in its own module: the `controllers`, the `services`, the `guards` and the related infrastructure implementations. Thus the logic stays in one location.

If an element is necessary in the other features (for example, a repository that gives access to the database), the module declares the element in the `exports.` key.

## Cross-cutting concerns

Some behaviours apply to all the application. Thus they are configured one time at the root and are not repeated on each endpoint.

- **Authentication**: a global JWT guard protects all the routes by default. A request must be authenticated, if the route does not have a different mark. The `@Public()` decorator removes a route from this rule.
- **Rate limiting**: two named throttlers are read from the environment. The `default` throttler applies globally, and the `stream` throttler applies to the long-lived SSE connections. An endpoint can change these values locally. For example, the login endpoint limits itself with `@Throttle` (5 requests in 60 seconds). The log stream removes the `default` throttler with `@SkipThrottle` and applies `@Throttle` on `stream` in its place.
- **Security headers**: `helmet()` sets the secure HTTP headers at bootstrap.
- **Environment validation**: a `class-validator` schema validates each variable when the application starts. If a variable is missing or incorrect, the application stops immediately.
- **Request correlation id**: a global middleware gives an id to each request. It uses the inbound `X-Request-Id` header or makes a new id, and it returns the id in the `X-Request-Id` response header..
- **Error envelope**: a global exception filter returns the same shape for all the errors. It keeps the message arrays that the `ValidationPipe` makes, and it changes an unexpected error into a generic 500.
