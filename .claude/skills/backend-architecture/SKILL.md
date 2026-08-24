---
name: backend-architecture
description: The architecture of `apps/backend`. Use it before you write, move, test or audit a file of that application. It routes to the page of `docs/architecture/backend/` that answers your question, and those pages are the single source of truth.
---

# The architecture of the backend of GitPaaS

This skill is a map, and not a copy. The pages of `docs/architecture/backend/` hold the detail, and they win over any other statement. The application obeys the hexagonal architecture and the vertical slicing; `features/` is the location by default.

Find the heading with `rtk grep -n`, then read the range with `Read`. Never read the whole page.

## The reference files

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
| [key-flows.md](../../../docs/architecture/backend/key-flows.md) | You need why a flow is built this way, or what the telemetry holds. | One `##` for one flow |
| [operations.md](../../../docs/architecture/backend/operations.md) | You need the command that an operator runs. | — |

## The neighbouring skills

- `backend-feature` holds the procedure that scaffolds a new resource. Invoke it, and keep this skill for the rules that it does not cover.
- `backend-unit-testing` holds the conventions of a spec.
- `nestjs-best-practices` holds the general practice of the framework. This skill wins over it.
