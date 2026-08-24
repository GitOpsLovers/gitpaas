---
name: backend-architecture
description: The architecture of the backend application (`apps/backend`). Use it before you write, move, test or audit a file of `apps/backend`, and when you need the layers of a feature, the ports and the adapters, the transformers, the naming of a file or of a class, the path aliases, or the location of a spec. It routes to the pages of `docs/architecture/backend/`, which hold the detail.
---

# The architecture of the backend of GitPaaS

This skill is a map, and not a copy. **The pages of `docs/architecture/backend/` are the single
source of truth.** If this file and a page disagree, the page wins, and you report the disagreement.

The application obeys the hexagonal architecture and the vertical slicing. `apps/backend/src/` holds
`core/`, `features/` and `shared/`, and `features/` is the location by default.

## The one rule

**Depend inward only.** An outer layer depends on an inner layer, and an inner layer never depends
on an outer layer. `domain/` must not import `infrastructure/` or `ui/`, and `core/` must never
import a feature. Every other rule of the backend serves this one.

## The page that answers your question

Read the section that you need, and not the whole page.

| Your question | The page |
|---|---|
| Which folder takes this file? What does each of the four layers hold? How does a module wire? | [structure.md](../../../docs/architecture/backend/structure.md) |
| How do I name this file, this class or this function? Which import takes an alias? | [conventions.md](../../../docs/architecture/backend/conventions.md), sections "File naming", "Class and function naming" and "Imports" |
| How does a port meet its adapter? Where does the ORM shape become a domain model? | [conventions.md](../../../docs/architecture/backend/conventions.md), sections "Ports and dependency injection" and "Transformers" |
| How do I validate a body? How does an error reach the client? | [conventions.md](../../../docs/architecture/backend/conventions.md) section "Validation", and [structure.md](../../../docs/architecture/backend/structure.md) section "Cross-cutting concerns" |
| Where does a spec live, and what does it cover? | [structure.md](../../../docs/architecture/backend/structure.md) section "Testing" |
| Which library takes this concern? | [stack.md](../../../docs/architecture/backend/stack.md) |
| Why is the flow built this way? What does the telemetry hold? | [key-flows.md](../../../docs/architecture/backend/key-flows.md) |
| Which command does an operator run? | [operations.md](../../../docs/architecture/backend/operations.md) |

## The three traps

These rules break the most often. The pages above hold the reason of each one.

1. **A use case is a pure function**, and it receives each collaborator as a parameter. Only the
   adapter is an `@Injectable()` provider.
2. **A repository of the infrastructure never returns an ORM shape.** An adjacent `*.transformer.ts`
   file maps the shape into a domain model.
3. **The consumer injects the concrete adapter class** and types it as the port interface. The
   project uses no injection token.

## To scaffold a new feature

The skill `backend-feature` holds the procedure, step by step. Invoke it, and keep this skill for
the rules that it does not cover.
