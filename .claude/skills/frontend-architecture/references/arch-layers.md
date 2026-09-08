# The layers of a feature

`docs/architecture/frontend/conventions.md` gives the one rule of the layering: an outer layer
depends on an inner layer, and never the other way around. This file gives the two extra slots
that a feature of `apps/frontend` may hold.

## `application/`

A feature that carries logic no `domain/` model and no `ui/` container should own puts it in
`application/`, as a plain exported function in a file `<name>.use-case.ts`. The function takes
its collaborators as parameters, and holds no state of its own. Example:
[`compute-service-state.use-case.ts`](../../../apps/frontend/src/app/features/services/application/compute-service-state.use-case.ts).

## `domain/constants/`

A feature with a fixed, non-configurable list — a set of required permissions, a set of allowed
values — puts it in `domain/constants/`, and not in `domain/models/`. Example:
[`provider-permissions.constants.ts`](../../../apps/frontend/src/app/features/providers/domain/constants/provider-permissions.constants.ts).

## The boundary between features

A feature must not import the `application/` layer of another feature. A helper more than one
feature needs belongs in a future `shared/application/`, and not in the `application/` of the
feature that wrote it first. `references/arch-known-deviations.md` records the current importers
of `@features/server/application/` that still cross this boundary.
