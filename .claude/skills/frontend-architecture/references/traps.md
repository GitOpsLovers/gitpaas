# The rules of the architecture of the frontend that break the most often

The pages of `docs/architecture/frontend/` are the single source of truth. If this file and a
page disagree, the page wins, and you report the disagreement.

## The one rule

**Depend inward only.** An outer layer depends on an inner layer, and an inner layer never depends
on an outer layer. `domain/` must not import `infrastructure/` or `ui/`. The business logic stays in
the feature, and never in a page.

## The four traps

These rules break the most often. The pages above hold the reason of each one.

1. **A read uses `httpResource`, and a mutation uses `HttpClient`.**
2. **A presentational component injects no service.** It uses `input()`, `input.required()` and
   `output()`, and no `@Input()` decorator.
3. **The name of the file is `<name>.component.ts` and `<name>.component.html`.** If an import path
   is wrong, correct the import. Never rename the file.
4. **Use the per-icon components of `@lucide/angular`** (`<svg lucideX>`), and not the dynamic
   module.
