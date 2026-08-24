# The rules of the architecture of the backend that break the most often

The pages of `docs/architecture/backend/` are the single source of truth. If this file and a
page disagree, the page wins, and you report the disagreement.

## The one rule

**Depend inward only.** An outer layer depends on an inner layer, and an inner layer never depends
on an outer layer. `domain/` must not import `infrastructure/` or `ui/`, and `core/` must never
import a feature. Every other rule of the backend serves this one.

## The three traps

These rules break the most often. The pages above hold the reason of each one.

1. **A use case is a pure function**, and it receives each collaborator as a parameter. Only the
   adapter is an `@Injectable()` provider.
2. **A repository of the infrastructure never returns an ORM shape.** An adjacent `*.transformer.ts`
   file maps the shape into a domain model.
3. **The consumer injects the concrete adapter class** and types it as the port interface. The
   project uses no injection token.
