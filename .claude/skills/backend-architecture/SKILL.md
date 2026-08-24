---
name: backend-architecture
description: The architecture of `apps/backend`, and the practice of NestJS. Use it before you write, move, test or audit a file of that application. It routes to the page of `docs/architecture/backend/` that answers your question, and those pages are the single source of truth.
---

# The backend of GitPaaS

`apps/backend` is an application of NestJS with TypeORM and PostgreSQL. It obeys the hexagonal architecture and the vertical slicing, and `features/` is the location by default.

This skill holds two tiers:

- **The architecture of this project.** The pages of `docs/architecture/backend/` hold the detail, and they win over any other statement, this skill included.
- **The practice of NestJS.** Read a file of `references/` when a question about the framework stays open after you read the page of the architecture. One rule is one file.

Read one file for your task, and never the folder. In a page of `docs/`, find the heading with `rtk grep -n`, then read that range with `Read`.

## The architecture of this project

| The file | Read it when | The heading |
| --- | --- | --- |
| [traps.md](references/traps.md) | You start any task of `apps/backend`. It holds the one rule and the three traps. | — |
| [structure.md](../../../docs/architecture/backend/structure.md) | You place a file, or you need what each of the four layers holds, or you wire a module. | `## Top-level source folders`, `## The four layers`, `## Structure of a feature`, `## Module wiring` |
| [structure.md](../../../docs/architecture/backend/structure.md) | You need where a spec lives and what it covers. | `## Testing` |
| [structure.md](../../../docs/architecture/backend/structure.md) | You need how an error or a guard crosses every feature. | `## Cross-cutting concerns` |
| [conventions.md](../../../docs/architecture/backend/conventions.md) | You name a file, a class or a function. | `## File naming`, `## Class and function naming` |
| [conventions.md](../../../docs/architecture/backend/conventions.md) | You need which import takes an alias. | `## Imports` |
| [conventions.md](../../../docs/architecture/backend/conventions.md) | You join a port to its adapter. | `## Ports and dependency injection` |
| [conventions.md](../../../docs/architecture/backend/conventions.md) | You turn an ORM shape into a domain model. | `## Transformers` |
| [conventions.md](../../../docs/architecture/backend/conventions.md) | You validate a body, or you shape a route. | `## Validation`, `## HTTP and REST` |
| [stack.md](../../../docs/architecture/backend/stack.md) | You choose the library that takes a concern. | — |
| [key-flows.md](../../../docs/architecture/backend/key-flows.md) | You need why a flow is built this way, how an error reaches the client, or what the telemetry holds. | One `##` for one flow |
| [operations.md](../../../docs/architecture/backend/operations.md) | You need the command that an operator runs, or you change the schema of the database. | — |

## The practice of NestJS

### Modules

| The file | Read it when |
| --- | --- |
| [arch-feature-modules.md](references/arch-feature-modules.md) | You place a module, by the feature and not by the layer of the technique. |
| [arch-module-sharing.md](references/arch-module-sharing.md) | You export or you import a provider between two modules. |
| [arch-avoid-circular-deps.md](references/arch-avoid-circular-deps.md) | Two modules import each other. |
| [arch-single-responsibility.md](references/arch-single-responsibility.md) | A service grew too large. |

### Injection

| The file | Read it when |
| --- | --- |
| [di-prefer-constructor-injection.md](references/di-prefer-constructor-injection.md) | You choose between the constructor and the property. |
| [di-scope-awareness.md](references/di-scope-awareness.md) | You need the scope singleton, request or transient. |
| [di-avoid-service-locator.md](references/di-avoid-service-locator.md) | Code asks the container for a dependency at the runtime. |
| [di-interface-segregation.md](references/di-interface-segregation.md) | A port asks a consumer for a method that it does not use. |
| [di-liskov-substitution.md](references/di-liskov-substitution.md) | An adapter must replace its port with no surprise. |

### The HTTP layer

| The file | Read it when |
| --- | --- |
| [api-use-pipes.md](references/api-use-pipes.md) | You transform the input of a handler. |
| [api-use-interceptors.md](references/api-use-interceptors.md) | You add a concern around every call. |
| [error-handle-async-errors.md](references/error-handle-async-errors.md) | A background task or a manual promise can reject. |

### Security

| The file | Read it when |
| --- | --- |
| [security-auth-jwt.md](references/security-auth-jwt.md) | You issue or you verify a token JWT. |
| [security-use-guards.md](references/security-use-guards.md) | You protect a route with a guard. |
| [security-rate-limiting.md](references/security-rate-limiting.md) | You limit the rate of the calls of a client. |

### The database

| The file | Read it when |
| --- | --- |
| [db-use-transactions.md](references/db-use-transactions.md) | Two writes must succeed together, or fail together. |
| [db-avoid-n-plus-one.md](references/db-avoid-n-plus-one.md) | A loop runs one query for one row. |
| [perf-optimize-database.md](references/perf-optimize-database.md) | A query is slow. |

### The lifecycle

| The file | Read it when |
| --- | --- |
| [perf-async-hooks.md](references/perf-async-hooks.md) | You use a hook of the lifecycle. |
| [devops-graceful-shutdown.md](references/devops-graceful-shutdown.md) | The service must stop with no loss of a request. |

## The neighbouring skills

- `backend-feature` holds the procedure that scaffolds a new resource. Invoke it, and keep this skill for the rules that it does not cover.
- `backend-unit-testing` holds every convention of a spec. This skill holds none.
