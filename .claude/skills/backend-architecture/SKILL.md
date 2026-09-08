---
name: backend-architecture
description: The architecture of `apps/backend`, and the practice of NestJS. Use it before you write, move, test or audit a file of that application. It routes to the page of `docs/architecture/backend/` that answers your question, and those pages are the single source of truth.
---

# The backend of GitPaaS

`apps/backend` is an application of NestJS with TypeORM and PostgreSQL. It obeys the hexagonal architecture and the vertical slicing, and `features/` is the location by default.

This skill holds two tiers:

- **The architecture of this project.** The pages of `docs/architecture/backend/` hold the detail, and they win over any other statement, this skill included.
- **The practice of NestJS.** Read a file of `references/` when a question about the framework stays open after you read the page of the architecture. One rule is one file.

## The architecture of this project

| The file | Read it when | The heading |
| --- | --- | --- |
| [traps.md](references/traps.md) | You start any task of `apps/backend`. It holds the one rule and the three traps. | — |
| [structure.md](../../../docs/architecture/backend/structure.md) | You place a file, you need what each of the four layers holds, you wire a module, you need where a spec lives, or you need how an error or a guard crosses every feature. | `## Top-level source folders`, `## The four layers`, `## Structure of a feature`, `## Module wiring`, `## Testing`, `## Cross-cutting concerns` |
| [arch-file-naming.md](references/arch-file-naming.md) | You name a file. | — |
| [arch-class-function-naming.md](references/arch-class-function-naming.md) | You name a class or a function. | — |
| [arch-jsdoc-comments.md](references/arch-jsdoc-comments.md) | You write the JSDoc comment of a class, a function or an interface. | — |
| [conventions.md](../../../docs/architecture/backend/conventions.md) | You need which import takes an alias. | `## Imports` |
| [conventions.md](../../../docs/architecture/backend/conventions.md) | You join a port to its adapter. | `## Ports and dependency injection` |
| [conventions.md](../../../docs/architecture/backend/conventions.md) | You turn an ORM shape into a domain model. | `## Transformers` |
| [conventions.md](../../../docs/architecture/backend/conventions.md) | You validate a body, or you shape a route. | `## Validation`, `## HTTP and REST` |
| [stack.md](../../../docs/architecture/backend/stack.md) | You choose the library that takes a concern. | — |
| [key-flows.md](../../../docs/architecture/backend/key-flows.md) | You need why a flow is built this way, how an error reaches the client, or what the telemetry holds. | One `##` for one flow |
| [arch-telemetry-event-schema.md](references/arch-telemetry-event-schema.md) | You add a field to the telemetry event, or you need its full schema. | — |
| [arch-known-deviations.md](references/arch-known-deviations.md) | You touch a Passport strategy, and you must not copy its deviation from `translateError`. | — |
| [operations.md](../../../docs/architecture/backend/operations.md) | You need the command that an operator runs, or you change the schema of the database. | — |

## The practice of NestJS

### Modules

| The file | Read it when |
| --- | --- |
| [arch-avoid-circular-deps.md](references/arch-avoid-circular-deps.md) | Two modules import each other. |

### The HTTP layer

| The file | Read it when |
| --- | --- |
| [error-handle-async-errors.md](references/error-handle-async-errors.md) | A promise floats with no `await` and no `return`, and it can reject with no handler. |

### The database

| The file | Read it when |
| --- | --- |
| [db-use-transactions.md](references/db-use-transactions.md) | Two writes must succeed together, or fail together. |
| [db-avoid-n-plus-one.md](references/db-avoid-n-plus-one.md) | A loop runs one query for one row. |

### The lifecycle

| The file | Read it when |
| --- | --- |
| [perf-async-hooks.md](references/perf-async-hooks.md) | You use a hook of the lifecycle. |

## The neighbouring skills

- `backend-feature` holds the procedure that scaffolds a new resource. Invoke it, and keep this skill for the rules that it does not cover.
- `backend-unit-testing` holds every convention of a spec. This skill holds none.
